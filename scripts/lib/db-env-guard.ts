import { DEV_REF, PROD_REF } from './supabase-refs.ts';

export type DatabaseTargetLabel = 'dev' | 'prod' | 'ci' | 'unknown' | 'missing';

export interface DatabaseTarget {
  ref: string | null;
  label: DatabaseTargetLabel;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? '';
}

export function extractSupabaseRef(url: string): string | null {
  const match = /postgres\.([a-z0-9]+):/i.exec(url);
  return match?.[1] ?? null;
}

export function describeDatabaseTarget(url = getDatabaseUrl()): DatabaseTarget {
  if (!url) return { ref: null, label: 'missing' };

  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return { ref: 'localhost', label: 'ci' };
  }

  const ref = extractSupabaseRef(url);
  if (!ref) return { ref: null, label: 'unknown' };
  if (ref === DEV_REF) return { ref, label: 'dev' };
  if (ref === PROD_REF) return { ref, label: 'prod' };
  return { ref, label: 'unknown' };
}

export function isProductionDatabaseUrl(url = getDatabaseUrl()): boolean {
  return describeDatabaseTarget(url).label === 'prod';
}

export function isDevDatabaseUrl(url = getDatabaseUrl()): boolean {
  const { label } = describeDatabaseTarget(url);
  return label === 'dev' || label === 'ci';
}

export function assertNotProductionDatabase(options: {
  scriptName: string;
  allowProdFlag?: string;
}): void {
  const url = getDatabaseUrl();
  if (!url) {
    console.error('Falta DATABASE_URL en el entorno.');
    process.exit(1);
  }

  const allowFlag = options.allowProdFlag ?? '--allow-prod';
  if (isProductionDatabaseUrl(url) && !process.argv.includes(allowFlag)) {
    console.error(
      `\n✗ ${options.scriptName} no puede ejecutarse contra producción (${PROD_REF}).`
    );
    console.error(`  Usa .env.dev (npm run db:*:dev) o pasa ${allowFlag} solo si es intencional.\n`);
    process.exit(1);
  }
}

export function assertDevDatabase(options: { scriptName: string }): void {
  const url = getDatabaseUrl();
  if (!url) {
    console.error('Falta DATABASE_URL en el entorno.');
    process.exit(1);
  }

  const target = describeDatabaseTarget(url);
  if (target.label === 'prod') {
    console.error(
      `\n✗ ${options.scriptName} solo puede ejecutarse en desarrollo (${DEV_REF}) o CI.`
    );
    console.error('  Usa: npm run db:restore-demo (carga .env.dev automáticamente)\n');
    process.exit(1);
  }
}

export function assertProductionExplicit(options: {
  scriptName: string;
  allowProdFlag?: string;
}): void {
  const url = getDatabaseUrl();
  if (!url) {
    console.error('Falta DATABASE_URL en el entorno.');
    process.exit(1);
  }

  const allowFlag = options.allowProdFlag ?? '--allow-prod';
  if (isProductionDatabaseUrl(url) && !process.argv.includes(allowFlag)) {
    console.error(
      `\n✗ ${options.scriptName} en producción requiere ${allowFlag} explícito.\n`
    );
    process.exit(1);
  }
}
