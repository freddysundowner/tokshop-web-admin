import { useEffect, useRef } from 'react';
import { useSocket } from '@/lib/socket-context';
import { ShowSocketService, ShowSocketEventHandlers } from '@/lib/socket-service';

/**
 * Hook to manage socket events for a show/room
 * This hook automatically subscribes/unsubscribes to socket events and handles cleanup
 */
export function useShowSocket(
  roomId: string | undefined,
  handlers: ShowSocketEventHandlers,
  options: {
    enabled?: boolean;
  } = {}
) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const serviceRef = useRef<ShowSocketService | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    if (!socket || !roomId || !isConnected || !enabled) return;

    // Join the room
    joinRoom(roomId);

    // Create socket service
    serviceRef.current = new ShowSocketService(socket, roomId, handlers);

    // Subscribe to events
    const unsubscribe = serviceRef.current.subscribe();

    // Cleanup
    return () => {
      unsubscribe();
      leaveRoom(roomId);
      serviceRef.current = null;
    };
  }, [socket, roomId, isConnected, enabled, joinRoom, leaveRoom]);

  return {
    service: serviceRef.current,
    isConnected,
    
    // Viewer actions
    /**
     * Place a bid on an auction
     */
    placeBid: (auctionId: string, amount: number, userId: string, userName: string) => {
      serviceRef.current?.placeBid(auctionId, amount, userId, userName);
    },
    /**
     * Join a giveaway
     */
    joinGiveaway: (giveawayId: string, userId: string, userName: string) => {
      serviceRef.current?.joinGiveaway(giveawayId, userId, userName);
    },
    /**
     * Follow a user in the show
     */
    followUser: (showId: string, userId: string, toFollowUserId: string) => {
      serviceRef.current?.followUser(showId, userId, toFollowUserId);
    },
    /**
     * Send a chat message
     */
    sendMessage: (message: string, senderName: string) => {
      serviceRef.current?.sendMessage(message, senderName);
    },
    /**
     * Send user connected event
     */
    sendUserConnected: (userId: string, userName: string) => {
      serviceRef.current?.sendUserConnected(userId, userName);
    },
    
    // Host actions
    /**
     * Start an auction (host only)
     */
    startAuction: (auction: any, increaseBidBy?: number) => {
      serviceRef.current?.startAuction(auction, increaseBidBy);
    },
    /**
     * Start a giveaway (host only)
     */
    startGiveaway: (giveawayId: string, showId: string) => {
      serviceRef.current?.startGiveaway(giveawayId, showId);
    },
    /**
     * End/draw a giveaway (host only)
     */
    endGiveaway: (giveawayId: string, showId: string) => {
      serviceRef.current?.endGiveaway(giveawayId, showId);
    },
    /**
     * Pin a product (host only)
     */
    pinProduct: (productId: string, tokshowId: string, pinned: boolean) => {
      serviceRef.current?.pinProduct(productId, tokshowId, pinned);
    },
    /**
     * Pin an auction (host only)
     */
    pinAuction: (auctionId: string, tokshowId: string, pinned: boolean) => {
      serviceRef.current?.pinAuction(auctionId, tokshowId, pinned);
    },
    /**
     * End the room/show (host only)
     */
    endRoom: (data: any) => {
      serviceRef.current?.endRoom(data);
    }
  };
}
