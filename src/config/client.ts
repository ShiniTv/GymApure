export const clientEnv = {
  EXCHANGE_RATE: Number(import.meta.env.VITE_EXCHANGE_RATE) || 40.5,
} as const;
