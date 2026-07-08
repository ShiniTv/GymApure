import https from 'node:https';

const BCV_URL = 'https://www.bcv.org.ve/';
const MIN_RATE = 1;
const MAX_RATE = 10_000;
const MAX_RETRIES = 3;

/** BCV serves an incomplete certificate chain; TLS verification is disabled only for this host. */
const bcvAgent = new https.Agent({ rejectUnauthorized: false });

export interface BcvUsdRate {
  rate: number;
  effectiveDate: string;
}

export function parseBcvUsdFromHtml(html: string): BcvUsdRate {
  const dolarBlock = /id="dolar"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i.exec(html);
  if (!dolarBlock) {
    throw new Error('No se encontró el bloque USD en la página del BCV');
  }

  const rateMatch = /<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/i.exec(dolarBlock[0]);
  if (!rateMatch?.[1]) {
    throw new Error('No se pudo leer el valor USD del BCV');
  }

  const rate = parseVenezuelanDecimal(rateMatch[1]);
  if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(`Tasa USD fuera de rango: ${rateMatch[1]}`);
  }

  const dateMatch =
    /Fecha\s+Valor:[\s\S]*?content="(\d{4}-\d{2}-\d{2})/i.exec(html) ??
    /property="dc:date"[^>]*content="(\d{4}-\d{2}-\d{2})/i.exec(html);

  if (!dateMatch?.[1]) {
    throw new Error('No se pudo leer la Fecha Valor del BCV');
  }

  return { rate, effectiveDate: dateMatch[1] };
}

export function parseVenezuelanDecimal(value: string): number {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(normalized);
}

function fetchBcvHtml(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      BCV_URL,
      {
        agent: bcvAgent,
        headers: {
          'User-Agent': 'GymApure/1.0 (+https://gymapure.app)',
          Accept: 'text/html',
        },
        timeout: 20_000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`BCV respondió HTTP ${res.statusCode}`));
          res.resume();
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Tiempo de espera agotado al consultar el BCV'));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchBcvUsdRate(): Promise<BcvUsdRate> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const html = await fetchBcvHtml();
      return parseBcvUsdFromHtml(html);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await sleep(attempt * 1_500);
      }
    }
  }

  throw lastError ?? new Error('No se pudo obtener la tasa del BCV');
}
