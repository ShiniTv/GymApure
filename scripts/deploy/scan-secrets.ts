/**
 * Escaneo de secretos con gitleaks (local o CI).
 * Uso: npm run secrets:scan
 *
 * Instalación local (opcional):
 *   Windows: choco install gitleaks
 *   macOS:   brew install gitleaks
 *   Linux:   ver https://github.com/gitleaks/gitleaks#installing
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, '.gitleaks.toml');

function hasGitleaks(): boolean {
  const probe = spawnSync('gitleaks', ['version'], { stdio: 'pipe', shell: true });
  return probe.status === 0;
}

function main() {
  if (!fs.existsSync(configPath)) {
    console.error('✗ Falta .gitleaks.toml en la raíz del proyecto');
    process.exit(1);
  }

  if (!hasGitleaks()) {
    console.error('✗ gitleaks no está instalado en PATH.');
    console.error('  CI lo ejecuta en cada push. Para local:');
    console.error('  Windows → choco install gitleaks');
    console.error('  macOS   → brew install gitleaks');
    process.exit(1);
  }

  console.log('Escaneando secretos con gitleaks…\n');
  const result = spawnSync(
    'gitleaks',
    ['detect', '--source', root, '--config', configPath, '--no-banner', '--redact'],
    { stdio: 'inherit', shell: true }
  );

  if (result.status === 0) {
    console.log('\n✓ secrets:scan — sin hallazgos');
  } else {
    console.error('\n✗ secrets:scan — posibles secretos detectados');
  }
  process.exit(result.status ?? 1);
}

main();
