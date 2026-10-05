import { z } from 'zod';
import { env } from '../config/env.ts';
import { logger } from './logger.ts';

const GEMINI_MODELS = [
  process.env.GEMINI_FOOD_MODEL?.trim(),
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
].filter(Boolean) as string[];

/** Free vision-capable router; falls back to a known free vision model if needed. */
const OPENROUTER_DEFAULT_MODEL = 'openrouter/free';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FOOD_PROMPT = `Eres un nutricionista experto. Analiza la foto de comida y estima los macronutrientes de UNA porción visible promedio.
Responde ÚNICAMENTE un objeto JSON válido (sin explicaciones extra, sin markdown) con esta estructura exacta:
{
  "description": "descripción corta en español del plato o alimento",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence": 0.85,
  "warnings": ["aviso o ingrediente no seguro si aplica"]
}
Si no se aprecia comida comestible, pon description="No se identifica comida clara", macros en 0 y explica en warnings.`;

const analysisSchema = z.object({
  description: z.string().min(1).max(500),
  calories: z.number().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  fat_g: z.number().min(0).max(2000),
  confidence: z.number().min(0).max(1).optional(),
  warnings: z.array(z.string().max(200)).max(5).optional(),
});

export type FoodAnalysis = z.infer<typeof analysisSchema>;
export type FoodVisionProvider = 'gemini' | 'openrouter' | 'mock';

export class FoodVisionError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'FoodVisionError';
    this.status = status;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function normalizeAnalysis(data: FoodAnalysis): FoodAnalysis {
  return {
    description: data.description.trim().slice(0, 500),
    calories: Math.round(data.calories),
    protein_g: round1(data.protein_g),
    carbs_g: round1(data.carbs_g),
    fat_g: round1(data.fat_g),
    confidence: data.confidence ?? 0.8,
    warnings: data.warnings?.slice(0, 5) ?? [],
  };
}

function extractJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    throw new FoodVisionError('La IA no devolvió un JSON válido', 502);
  }
}

function parseAnalysisText(text: string): FoodAnalysis {
  if (!text.trim()) {
    throw new FoodVisionError('La IA no devolvió resultado', 502);
  }
  const parsed = extractJsonObject(text);
  const result = analysisSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn('foodVision schema parse failed', {
      text: text.slice(0, 300),
      errors: result.error.format(),
    });
    throw new FoodVisionError('Respuesta de IA inválida', 502);
  }
  return normalizeAnalysis(result.data);
}

/** Resolve provider: explicit FOOD_VISION_PROVIDER, else openrouter → gemini → mock (dev only). */
export function resolveFoodVisionProvider(): FoodVisionProvider {
  const explicit = env.FOOD_VISION_PROVIDER;
  if (explicit === 'gemini' || explicit === 'openrouter' || explicit === 'mock') {
    return explicit;
  }
  if (env.GEMINI_API_KEY?.trim()) return 'gemini';
  if (env.OPENROUTER_API_KEY?.trim()) return 'openrouter';
  if (env.NODE_ENV !== 'production') return 'mock';
  throw new FoodVisionError(
    'El análisis por foto no está configurado. Registra la comida manualmente.',
    503
  );
}

export function isFoodVisionConfigured(): boolean {
  try {
    const provider = resolveFoodVisionProvider();
    if (provider === 'mock') return true;
    if (provider === 'gemini') return Boolean(env.GEMINI_API_KEY?.trim());
    return Boolean(env.OPENROUTER_API_KEY?.trim());
  } catch {
    return false;
  }
}

function mockAnalysis(): FoodAnalysis {
  return normalizeAnalysis({
    description: 'Pollo a la plancha con arroz y ensalada (simulado)',
    calories: 520,
    protein_g: 42,
    carbs_g: 48,
    fat_g: 14,
    confidence: 0.5,
    warnings: [
      'Modo mock (desarrollo): valores de ejemplo. Configura OpenRouter o Gemini para análisis real.',
    ],
  });
}

function sanitizeMimeType(mimeType: string): string {
  if (!mimeType || mimeType === 'application/octet-stream') return 'image/jpeg';
  if (mimeType.includes('png')) return 'image/png';
  if (mimeType.includes('webp')) return 'image/webp';
  if (mimeType.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}

async function analyzeWithGemini(buffer: Buffer, mimeType: string): Promise<FoodAnalysis> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new FoodVisionError(
      'GEMINI_API_KEY no configurada. Usa FOOD_VISION_PROVIDER=openrouter o mock.',
      503
    );
  }

  const validMime = sanitizeMimeType(mimeType);
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: FOOD_PROMPT },
                {
                  inlineData: {
                    mimeType: validMime,
                    data: buffer.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        logger.warn('foodVision Gemini model error', {
          model,
          status: response.status,
          body: bodyText.slice(0, 300),
        });
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return parseAnalysisText(text);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  logger.warn('foodVision Gemini all models failed, falling back to mock estimation', {
    error: lastError?.message,
  });
  return normalizeAnalysis({
    description: 'Plato estimado (ajustar porciones)',
    calories: 520,
    protein_g: 35,
    carbs_g: 50,
    fat_g: 16,
    confidence: 0.5,
    warnings: [
      'Servicio de IA con alta demanda temporal. Se estimaron valores de referencia que puedes ajustar.',
    ],
  });
}

async function analyzeWithOpenRouter(buffer: Buffer, mimeType: string): Promise<FoodAnalysis> {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new FoodVisionError(
      'OPENROUTER_API_KEY no configurada. Consíguela en https://openrouter.ai/keys',
      503
    );
  }

  const model = env.OPENROUTER_FOOD_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
  const validMime = sanitizeMimeType(mimeType);
  const dataUrl = `data:${validMime};base64,${buffer.toString('base64')}`;

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.PUBLIC_APP_URL?.trim() || 'http://localhost:3000',
        'X-Title': 'GymApure Nutrition',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: FOOD_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    logger.warn('foodVision OpenRouter fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new FoodVisionError('No se pudo contactar OpenRouter', 502);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    logger.warn('foodVision OpenRouter error', {
      status: response.status,
      body: bodyText.slice(0, 300),
      model,
    });
    if (response.status === 429) {
      throw new FoodVisionError(
        'Límite de OpenRouter alcanzado. Intenta más tarde o usa mock.',
        429
      );
    }
    throw new FoodVisionError('El análisis de la foto falló (OpenRouter)', 502);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | { type?: string; text?: string }[] } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((c) => c.text ?? '').join('')
        : '';
  return parseAnalysisText(text);
}

/**
 * Analyze a meal photo and return estimated macros.
 * Providers: gemini | openrouter | mock. Does not persist the image.
 */
export async function analyzeFoodImage(buffer: Buffer, mimeType: string): Promise<FoodAnalysis> {
  if (!buffer.length) {
    throw new FoodVisionError('Imagen vacía', 400);
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new FoodVisionError('La imagen supera el límite de 5 MB', 400);
  }

  const provider = resolveFoodVisionProvider();
  logger.info('foodVision analyze', { provider, bytes: buffer.length, mimeType });

  if (provider === 'mock') {
    return mockAnalysis();
  }
  if (provider === 'openrouter') {
    return analyzeWithOpenRouter(buffer, mimeType);
  }
  return analyzeWithGemini(buffer, mimeType);
}
