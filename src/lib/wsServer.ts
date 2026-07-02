import { type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import cookie from 'cookie';
import { isOriginAllowed } from '../api/middleware/cors.ts';
import { verifySessionToken } from './sessionAuth.ts';
import { logger } from './logger.ts';

let io: Server | null = null;

export function initWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (isOriginAllowed(origin)) {
          cb(null, true);
          return;
        }
        cb(new Error('CORS no permitido'));
      },
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token || socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Token requerido'));
      }

      const result = await verifySessionToken(token);
      if (result.type !== 'success') {
        return next(new Error('Autenticación fallida'));
      }

      (socket as { userId?: number }).userId = result.user.id;
      (socket as { userRole?: string }).userRole = result.user.role;
      next();
    } catch {
      next(new Error('Autenticación fallida'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as { userId?: number }).userId;
    const userRole = (socket as { userRole?: string }).userRole;

    socket.join(`user:${userId}`);

    if (userRole === 'admin' || userRole === 'receptionist') {
      socket.join('staff');
    }
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: number | string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToStaff(event: string, data: unknown) {
  io?.to('staff').emit(event, data);
}
