import { PROD_REF } from './supabase-refs.ts';

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? '';
}

export function isProductionDatabaseUrl(url = getDatabaseUrl()): boolean {
  return url.includes(PROD_REF);
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
    console.error(`  Usa un .env.dev local o pasa ${allowFlag} solo si es intencional.\n`);
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
