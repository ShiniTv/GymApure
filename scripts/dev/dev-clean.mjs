import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:os';

const PORT = Number(process.env.PORT ?? 3000);
const VITE_WS_PORT = 24678;

function killPort(port) {
  if (platform() === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING')) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[dev:clean] Proceso ${pid} en puerto ${port} detenido`);
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* nothing listening */
    }
    return;
  }

  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore', shell: true });
    console.log(`[dev:clean] Puerto ${port} liberado`);
  } catch {
    /* nothing listening */
  }
}

killPort(PORT);
killPort(VITE_WS_PORT);

const env = { ...process.env };
delete env.DATABASE_URL;

console.log('[dev:clean] Arrancando npm run dev (DATABASE_URL solo desde .env)...\n');

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
