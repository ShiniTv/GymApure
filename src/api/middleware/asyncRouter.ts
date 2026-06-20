import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { asyncHandler } from './asyncHandler.ts';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

const WRAPPED = Symbol('asyncWrapped');

function wrapHandler(handler: RequestHandler): RequestHandler {
  if (typeof handler !== 'function') return handler;
  const tagged = handler as RequestHandler & { [WRAPPED]?: boolean };
  if (tagged[WRAPPED]) return handler;

  const wrapped = asyncHandler(handler as AsyncRequestHandler);
  (wrapped as RequestHandler & { [WRAPPED]?: boolean })[WRAPPED] = true;
  return wrapped;
}

/** Express router that forwards rejected async handlers to the global error middleware. */
export function asyncRouter(): IRouter {
  const router = Router();
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all'] as const;

  for (const method of methods) {
    const original = router[method].bind(router);
    router[method] = ((...args: unknown[]) => {
      const wrapped = args.map((handler) => wrapHandler(handler as RequestHandler));
      return original(...(wrapped as Parameters<typeof original>));
    }) as IRouter[typeof method];
  }

  return router;
}
