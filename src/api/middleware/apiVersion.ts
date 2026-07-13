import type { Request, Response, NextFunction } from 'express';

const API_VERSION = '1.0.0';

const DEPRECATED_VERSIONS: Record<string, string> = {};

export function apiVersionHeader(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-API-Version', API_VERSION);
  next();
}

export function setVersionDeprecated(version: string, sunsetDate: string, link: string) {
  DEPRECATED_VERSIONS[version] = `Sun: ${sunsetDate}; Link: <${link}>`;
}

export function deprecationCheck(version: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const info = DEPRECATED_VERSIONS[version];
    if (info) {
      res.setHeader('Deprecation', info);
    }
    next();
  };
}
