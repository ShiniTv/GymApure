/**
 * Serve OpenAPI document for /api and /api/v1 clients.
 */
import fs from 'node:fs';
import path from 'node:path';
import { asyncRouter } from './middleware/asyncRouter.ts';

const router = asyncRouter();

let cachedYaml: string | null = null;

function loadOpenApiYaml(): string {
  if (cachedYaml) return cachedYaml;
  const candidates = [
    path.join(process.cwd(), 'docs', 'openapi', 'openapi.yaml'),
    path.join(process.cwd(), 'dist', 'openapi', 'openapi.yaml'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      cachedYaml = fs.readFileSync(file, 'utf8');
      return cachedYaml;
    }
  }
  throw new Error('OpenAPI spec not found (docs/openapi/openapi.yaml)');
}

router.get('/openapi.yaml', (_req, res) => {
  try {
    const yaml = loadOpenApiYaml();
    res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(yaml);
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'OpenAPI no disponible',
    });
  }
});

router.get('/openapi.json', (_req, res) => {
  res.status(501).json({
    error:
      'Usa GET /api/openapi.yaml (fuente canónica). JSON se generará en una iteración posterior.',
    yaml: '/api/openapi.yaml',
  });
});

export default router;
