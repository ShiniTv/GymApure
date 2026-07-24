import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { CHAT_CHANNEL_LABELS, isChatStaffChannel } from '../lib/chat/types';

interface TypingPayload {
  conversationId: number;
  userId: number;
  role?: string;
  isTyping: boolean;
}

/**
 * Join conversation room, emit typing, and expose peer typing label.
 */
export function useChatTyping(conversationId: number | null) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerLabel, setPeerLabel] = useState('Alguien');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!socket || !isConnected || conversationId == null) {
      setPeerTyping(false);
      return;
    }

    socket.emit('chat:join', { conversationId });

    const onTyping = (payload: TypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      if (user?.id != null && Number(payload.userId) === Number(user.id)) return;

      if (payload.role && isChatStaffChannel(payload.role)) {
        setPeerLabel(CHAT_CHANNEL_LABELS[payload.role]);
      } else {
        setPeerLabel('El miembro');
      }

      setPeerTyping(Boolean(payload.isTyping));
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (payload.isTyping) {
        stopTimerRef.current = setTimeout(() => setPeerTyping(false), 3500);
      }
    };

    socket.on('chat:typing', onTyping);

    return () => {
      socket.emit('chat:leave', { conversationId });
      socket.off('chat:typing', onTyping);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      setPeerTyping(false);
    };
  }, [socket, isConnected, conversationId, user?.id]);

  const emitTyping = (isTyping: boolean) => {
    if (!socket || !isConnected || conversationId == null) return;
    const now = Date.now();
    if (isTyping && now - lastEmitRef.current < 1200) return;
    lastEmitRef.current = now;
    socket.emit('chat:typing', { conversationId, isTyping });
  };

  return {
    isPeerTyping: peerTyping,
    typingLabel: peerTyping ? `${peerLabel} está escribiendo…` : null,
    emitTyping,
  };
}
