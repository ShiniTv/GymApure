import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { dispatchSessionRevoked } from '../lib/sessionEvents';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    let active = true;

    void import('socket.io-client').then(({ io }) => {
      if (!active) return;

      const s = io({
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));

      s.on('check-in:new', () => {
        queryClient.invalidateQueries({ queryKey: ['members'] });
      });

      s.on('payment:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      });

      s.on('message:new', (payload?: { conversationId?: number }) => {
        void queryClient.invalidateQueries({ queryKey: ['chat'] });
        const conversationId = payload?.conversationId;
        if (conversationId != null) {
          void queryClient.invalidateQueries({
            queryKey: ['chat', 'messages', conversationId],
          });
        }
      });

      s.on('stats:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      });

      s.on('notification:new', () => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      s.on('session:revoked', () => {
        dispatchSessionRevoked({
          message: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo.',
        });
      });

      socketRef.current = s;
    });

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
