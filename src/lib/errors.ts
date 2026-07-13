export function getErrorMessage(err: unknown, fallback = 'Error interno'): string {
  return err instanceof Error ? err.message : fallback;
}
