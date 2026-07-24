import { type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import cookie from 'cookie';
import { isOriginAllowed } from '../api/middleware/cors.ts';
import { verifySessionToken } from './sessionAuth.ts';
import { isStaffRole } from './roles.ts';
import { logger } from './logger.ts';
import type { ChatStaffChannel } from './chat/types.ts';

let io: Server | null = null;

function staffRoomForRole(role: string): string {
  return `staff:${role}`;
}

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

  io.use((socket, next) => {
    void (async () => {
      try {
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies.token;
        if (!token || typeof token !== 'string') {
          next(new Error('Token requerido'));
          return;
        }

        const result = await verifySessionToken(token);
        if (result.type !== 'success') {
          next(new Error('Autenticación fallida'));
          return;
        }

        (socket as { userId?: number }).userId = result.user.id;
        (socket as { userRole?: string }).userRole = result.user.role;
        next();
      } catch {
        next(new Error('Autenticación fallida'));
      }
    })();
  });

  io.on('connection', (socket) => {
    const userId = (socket as { userId?: number }).userId;
    const userRole = (socket as { userRole?: string }).userRole;

    socket.join(`user:${userId}`);

    if (userRole && isStaffRole(userRole)) {
      socket.join(staffRoomForRole(userRole));
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

export function emitToStaffRole(role: ChatStaffChannel | string, event: string, data: unknown) {
  io?.to(staffRoomForRole(role)).emit(event, data);
}

/** @deprecated Prefer emitToStaffRole — kept for any legacy callers. */
export function emitToStaff(event: string, data: unknown) {
  emitToStaffRole('admin', event, data);
  emitToStaffRole('receptionist', event, data);
  emitToStaffRole('trainer', event, data);
}

/** Notify member + staff connected on the conversation's channel. */
export function emitChatMessageNew(payload: {
  conversationId: number;
  memberId: number;
  channel: ChatStaffChannel;
}) {
  emitToUser(payload.memberId, 'message:new', payload);
  emitToStaffRole(payload.channel, 'message:new', payload);
}
