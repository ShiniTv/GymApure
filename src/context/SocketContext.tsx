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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const role = user.role;
    const isStaff = role === 'admin' || role === 'receptionist' || role === 'trainer';
    let active = true;

    void import('socket.io-client').then(({ io }) => {
      if (!active) return;

      const s = io({
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));

      if (role === 'admin' || role === 'receptionist') {
        s.on('check-in:new', () => {
          queryClient.invalidateQueries({ queryKey: ['members'] });
        });
        s.on('payment:updated', () => {
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          if (role === 'admin') {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          }
        });
      }

      s.on('message:new', (payload?: { conversationId?: number }) => {
        void queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
        void queryClient.invalidateQueries({ queryKey: ['chat', 'mine'] });
        if (isStaff) {
          void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        }
        const conversationId = payload?.conversationId;
        if (conversationId != null) {
          void queryClient.invalidateQueries({
            queryKey: ['chat', 'messages', conversationId],
          });
        } else {
          void queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
        }
      });

      s.on('stats:updated', () => {
        if (role === 'admin') {
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
        if (role === 'member') {
          queryClient.invalidateQueries({ queryKey: ['member-stats'] });
        }
        if (role === 'receptionist') {
          queryClient.invalidateQueries({ queryKey: ['reception-stats'] });
        }
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
      setSocket(s);
    });

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
