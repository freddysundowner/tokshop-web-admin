import { Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';

export interface ShowSocketEventHandlers {
  onUserConnected?: (data: { userId: string; userName: string }) => void;
  onCurrentUserJoined?: (data: any) => void;
  onUserLeft?: (data: { userId: string; userName: string }) => void;
  onRoomStarted?: (room: any) => void;
  onRoomEnded?: (data?: any) => void;
  onProductPinned?: (data: any) => void;
  onPinnedProductUpdated?: (data: { quantity: number | null }) => void;
  onFollowedUser?: (data: any) => void;
  onAuctionStarted?: (auction: any) => void;
  onAuctionPinned?: (auction: any) => void;
  onBidUpdated?: (auction: any) => void;
  onAuctionTimeExtended?: (data: { newEndTime: number; serverTime?: number }) => void;
  onAuctionEnded?: (auction: any) => void;
  onAuctionError?: (data: { error: any; code?: string; message?: string }) => void;
  onGiveawayStarted?: (giveaway: any) => void;
  onGiveawayJoined?: (giveaway: any) => void;
  onGiveawayEnded?: (giveaway: any) => void;
  onMessage?: (message: any) => void;
}

export class ShowSocketService {
  private socket: Socket;
  private roomId: string;
  private handlers: ShowSocketEventHandlers;

  constructor(socket: Socket, roomId: string, handlers: ShowSocketEventHandlers = {}) {
    this.socket = socket;
    this.roomId = roomId;
    this.handlers = handlers;
  }

  /**
   * Subscribe to all show-related socket events
   */
  subscribe(): () => void {
    // User connected
    this.socket.on('user-connected', (data: any) => {
      console.log('User connected:', data);
      this.handlers.onUserConnected?.(data);
    });

    // Current user joined
    this.socket.on('current-user-joined', (data: any) => {
      console.log('Current user joined:', data);
      this.handlers.onCurrentUserJoined?.(data);
    });

    // User disconnected
    this.socket.on('left-room', (data: any) => {
      console.log('User left:', data);
      this.handlers.onUserLeft?.(data);
    });

    // Room started
    this.socket.on('room-started', (room: any) => {
      console.log('Room started:', room);
      this.handlers.onRoomStarted?.(room);
    });

    // Room ended
    this.socket.on('room-ended', (data: any) => {
      console.log('Room ended:', data);
      this.handlers.onRoomEnded?.(data);
    });

    // Product pinned
    this.socket.on('product-pinned', (data: any) => {
      console.log('Product pinned:', data);
      this.handlers.onProductPinned?.(data);
    });

    // Pinned product updated
    this.socket.on('updated-pinned-product', (data: any) => {
      console.log('Pinned product updated:', data);
      this.handlers.onPinnedProductUpdated?.(data);
    });

    // User followed
    this.socket.on('followed-user', (data: any) => {
      console.log('User followed:', data);
      this.handlers.onFollowedUser?.(data);
    });

    // Auction started
    this.socket.on('auction-started', (auction: any) => {
      console.log('Auction started:', auction);
      this.handlers.onAuctionStarted?.(auction);
    });

    // Auction pinned
    this.socket.on('auction-pinned', (auction: any) => {
      console.log('Auction pinned:', auction);
      this.handlers.onAuctionPinned?.(auction);
    });

    // Bid updated
    this.socket.on('bid-updated', (auction: any) => {
      console.log('Bid updated:', auction);
      this.handlers.onBidUpdated?.(auction);
    });

    // Auction time extended
    this.socket.on('auction-time-extended', (data: any) => {
      console.log('Auction time extended:', data);
      this.handlers.onAuctionTimeExtended?.(data);
    });

    // Auction ended
    this.socket.on('auction-ended', (auction: any) => {
      console.log('Auction ended:', auction);
      this.handlers.onAuctionEnded?.(auction);
    });

    // Auction error
    this.socket.on('auction-error', (data: any) => {
      console.log('Auction error:', data);
      this.handlers.onAuctionError?.(data);
    });

    // Giveaway started
    this.socket.on('started-giveaway', (giveaway: any) => {
      console.log('Giveaway started:', giveaway);
      this.handlers.onGiveawayStarted?.(giveaway);
    });

    // Giveaway joined
    this.socket.on('joined-giveaway', (giveaway: any) => {
      console.log('Giveaway joined:', giveaway);
      this.handlers.onGiveawayJoined?.(giveaway);
    });

    // Giveaway ended
    this.socket.on('ended-giveaway', (giveaway: any) => {
      console.log('Giveaway ended:', giveaway);
      this.handlers.onGiveawayEnded?.(giveaway);
    });

    // Chat message
    this.socket.on('createMessage', (message: any) => {
      console.log('Message received:', message);
      this.handlers.onMessage?.(message);
    });

    // Return cleanup function
    return () => this.unsubscribe();
  }

  /**
   * Unsubscribe from all socket events
   */
  unsubscribe(): void {
    this.socket.off('user-connected');
    this.socket.off('current-user-joined');
    this.socket.off('left-room');
    this.socket.off('room-started');
    this.socket.off('room-ended');
    this.socket.off('product-pinned');
    this.socket.off('updated-pinned-product');
    this.socket.off('followed-user');
    this.socket.off('auction-started');
    this.socket.off('auction-pinned');
    this.socket.off('bid-updated');
    this.socket.off('auction-time-extended');
    this.socket.off('auction-ended');
    this.socket.off('auction-error');
    this.socket.off('started-giveaway');
    this.socket.off('joined-giveaway');
    this.socket.off('ended-giveaway');
    this.socket.off('createMessage');
  }

  /**
   * Emit a bid for an auction
   */
  placeBid(auctionId: string, amount: number, userId: string, userName: string): void {
    this.socket.emit('place-bid', {
      auctionId,
      roomId: this.roomId,
      userId,
      userName,
      amount
    });
  }

  /**
   * Join a giveaway
   */
  joinGiveaway(giveawayId: string, userId: string, userName: string): void {
    this.socket.emit('join-giveaway', {
      giveawayId,
      roomId: this.roomId,
      userId,
      userName
    });
  }

  /**
   * Start a giveaway (host only)
   */
  startGiveaway(giveawayId: string, showId: string): void {
    this.socket.emit('start-giveaway', {
      giveawayId,
      showId
    });
  }

  /**
   * End/draw a giveaway (host only)
   */
  endGiveaway(giveawayId: string, showId: string): void {
    this.socket.emit('draw-giveaway', {
      giveawayId,
      showId
    });
  }

  /**
   * Start an auction (host only)
   */
  startAuction(auction: any, increaseBidBy?: number): void {
    this.socket.emit('start-auction', {
      roomId: this.roomId,
      auction,
      increaseBidBy
    });
  }

  /**
   * Pin a product (host only)
   */
  pinProduct(productId: string, tokshowId: string, pinned: boolean): void {
    this.socket.emit('pin-product', {
      pinned,
      product: productId,
      tokshow: tokshowId
    });
  }

  /**
   * Pin an auction (host only)
   */
  pinAuction(auctionId: string, tokshowId: string, pinned: boolean): void {
    this.socket.emit('pin-auction', {
      pinned,
      auction: auctionId,
      tokshow: tokshowId
    });
  }

  /**
   * Follow a user in the show
   */
  followUser(showId: string, userId: string, toFollowUserId: string): void {
    this.socket.emit('follow-user', {
      showId,
      userId,
      toFollowUserId
    });
  }

  /**
   * End the room/show (host only)
   */
  endRoom(data: any): void {
    this.socket.emit('end-room', data);
  }

  /**
   * Send a chat message
   */
  sendMessage(message: string, senderName: string): void {
    if (!message.trim()) return;
    
    this.socket.emit('createMessage', {
      message,
      senderName
    });
  }

  /**
   * Send a user-connected event
   */
  sendUserConnected(userId: string, userName: string): void {
    this.socket.emit('user-connected', {
      roomId: this.roomId,
      userId,
      userName
    });
  }
}

/**
 * Create and configure a ShowSocketService instance
 */
export function createShowSocketService(
  socket: Socket,
  roomId: string,
  handlers: ShowSocketEventHandlers
): ShowSocketService {
  return new ShowSocketService(socket, roomId, handlers);
}
