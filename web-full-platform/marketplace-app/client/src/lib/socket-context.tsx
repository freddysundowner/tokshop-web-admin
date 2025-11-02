import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to Socket.IO server on Icona API
    const ICONA_API_BASE = import.meta.env.VITE_ICONA_API_BASE || 'https://api.iconaapp.com';
    console.log('🔌 Connecting to Socket.IO server:', ICONA_API_BASE);
    
    const socketInstance = io(ICONA_API_BASE, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected to:', ICONA_API_BASE);
      console.log('Socket ID:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (roomId: string) => {
    if (!socket) {
      console.warn('⚠️ Cannot join room: socket not connected');
      return;
    }
    
    // Allow guest viewers by generating temporary ID
    const socketId = socket.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
    const userId = user ? ((user as any)._id || (user as any).id || user.id) : `guest_${socketId}`;
    const userName = user ? ((user as any).userName || user.firstName || user.email) : `Guest_${socketId.slice(0, 6)}`;
    
    console.log('📤 Emitting join-room event:', { roomId, userId, userName });
    socket.emit('join-room', {
      roomId,
      userId,
      userName
    });
  };

  const leaveRoom = (roomId: string) => {
    if (!socket) {
      console.warn('⚠️ Cannot leave room: socket not connected');
      return;
    }
    
    // Allow guest viewers by generating temporary ID
    const socketId = socket.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
    const userId = user ? ((user as any)._id || (user as any).id || user.id) : `guest_${socketId}`;
    const userName = user ? ((user as any).userName || user.firstName || user.email) : `Guest_${socketId.slice(0, 6)}`;
    
    console.log('📤 Emitting leave-room event:', { roomId, userId, userName });
    socket.emit('leave-room', {
      roomId,
      userId,
      userName
    });
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
