import { Response, NextFunction } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { asyncHandler } from './asyncHandler.ts';
import { requireMfaForStaff } from '../../config/env.ts';
import { getUserMfaState, isMfaStaffRole } from '../../lib/mfa.ts';

/**
 * Bloquea rutas protegidas para staff sin MFA cuando REQUIRE_MFA_FOR_STAFF=true.
 * La configuración MFA sigue en /api/auth/mfa/* (rutas propias con authenticate).
 */
export const enforceMfaForStaff = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!requireMfaForStaff || !req.user) {
      next();
      return;
    }

    if (!isMfaStaffRole(req.user.role)) {
      next();
      return;
    }

    const state = await getUserMfaState(req.user.id);
    if (state.mfa_enabled && state.mfa_secret) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Debes activar MFA antes de usar el panel. Ve a Seguridad MFA.',
      mfa_setup_required: true,
    });
  }
);
