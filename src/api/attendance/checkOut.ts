import type { RequestHandler } from 'express';
import { normalizeCedulaInput } from '../../lib/cedulaUtils.ts';
import { performCheckOut } from './attendanceCore.ts';

/** Public kiosk check-out (no JWT). Protected by X-Kiosk-Key + rate limit. */
export const checkOutHandler: RequestHandler = async (req, res) => {
  const cedula = normalizeCedulaInput(req.body?.cedula);
  if (!cedula) {
    return res.status(400).json({ error: 'Cédula requerida' });
  }

  try {
    const result = await performCheckOut(cedula);
    res.status(result.status).json(result.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
