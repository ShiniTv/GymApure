/** Admins must have MFA enabled before completing login in production. */
export function adminMustEnableMfaBeforeLogin(mfaEnabled: boolean, nodeEnv: string): boolean {
  return nodeEnv === 'production' && !mfaEnabled;
}
