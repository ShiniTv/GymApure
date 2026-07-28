/** Server-only helpers — re-export for gradual migration. Do not import from React pages. */
export { encryptMfaSecret, decryptMfaSecret, isEncryptedMfaSecret } from '../mfaCrypto.ts';
export {
  trainerHasMemberAccess,
  ensureTrainerMemberAssignment,
  trainerOwnsRoutine,
  isActiveMember,
} from '../trainerAccess.ts';
export {
  verifySessionToken,
  sessionFailureStatus,
  createLoginSession,
  type DbSessionUser,
} from '../sessionAuth.ts';
export { hashPassword, verifyPassword } from '../passwordHash.ts';
