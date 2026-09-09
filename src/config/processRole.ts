import { z } from 'zod';

const processRoleSchema = z.enum(['all', 'web', 'worker']).default('all');

/** web = HTTP+WS only; worker = crons/queues; all = monolith (local/CI default). */
export function resolveProcessRole(): 'all' | 'web' | 'worker' {
  const raw = process.env.PROCESS_ROLE?.trim().toLowerCase() ?? 'all';
  const parsed = processRoleSchema.safeParse(raw === '' ? 'all' : raw);
  return parsed.success ? parsed.data : 'all';
}

export function shouldRunHttpServer(role = resolveProcessRole()): boolean {
  return role === 'all' || role === 'web';
}

export function shouldRunBackgroundJobs(role = resolveProcessRole()): boolean {
  return role === 'all' || role === 'worker';
}
