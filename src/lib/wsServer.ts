import { type Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import cookie from 'cookie';
import { isOriginAllowed } from '../api/middleware/cors.ts';
import { verifySessionToken } from './sessionAuth.ts';
import { isStaffRole } from './roles.ts';
import { logger } from './logger.ts';
import { getConversationById } from './chat/conversations.ts';
import { trainerHasMemberAccess } from './trainerAccess.ts';
import type { ChatStaffChannel } from './chat/types.ts';

type AuthedSocket = Socket & { userId?: number; userRole?: string };

let io: Server | null = null;

function staffRoomForRole(role: string): string {
  return `staff:${role}`;
}

function conversationRoom(conversationId: number): string {
  return `conversation:${conversationId}`;
}

async function canAccessConversationSocket(
  socket: AuthedSocket,
  conversationId: number
): Promise<boolean> {
  const userId = socket.userId;
  const userRole = socket.userRole;
  if (userId == null || !userRole) return false;

  const conversation = await getConversationById(conversationId);
  if (!conversation) return false;

  if (userRole === 'member') {
    return Number(conversation.member_id) === Number(userId);
  }

  if (!isStaffRole(userRole)) return false;
  if (userRole !== conversation.channel) return false;

  if (userRole === 'trainer') {
    return trainerHasMemberAccess(userId, conversation.member_id);
  }

  return true;
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

        (socket as AuthedSocket).userId = result.user.id;
        (socket as AuthedSocket).userRole = result.user.role;
        next();
      } catch {
        next(new Error('Autenticación fallida'));
      }
    })();
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const userId = socket.userId;
    const userRole = socket.userRole;

    socket.join(`user:${userId}`);

    if (userRole && isStaffRole(userRole)) {
      socket.join(staffRoomForRole(userRole));
    }

    socket.on('chat:join', (payload: { conversationId?: number }) => {
      void (async () => {
        const conversationId = Number(payload?.conversationId);
        if (!Number.isFinite(conversationId)) return;
        const allowed = await canAccessConversationSocket(socket, conversationId);
        if (!allowed) return;
        void socket.join(conversationRoom(conversationId));
      })();
    });

    socket.on('chat:leave', (payload: { conversationId?: number }) => {
      const conversationId = Number(payload?.conversationId);
      if (!Number.isFinite(conversationId)) return;
      void socket.leave(conversationRoom(conversationId));
    });

    socket.on('chat:typing', (payload: { conversationId?: number; isTyping?: boolean }) => {
      void (async () => {
        const conversationId = Number(payload?.conversationId);
        if (!Number.isFinite(conversationId) || userId == null) return;
        const allowed = await canAccessConversationSocket(socket, conversationId);
        if (!allowed) return;

        socket.to(conversationRoom(conversationId)).emit('chat:typing', {
          conversationId,
          userId,
          role: userRole,
          isTyping: Boolean(payload?.isTyping),
        });
      })();
    });
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
  io?.to(conversationRoom(payload.conversationId)).emit('message:new', payload);
}
