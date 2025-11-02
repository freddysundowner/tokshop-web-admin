# Socket.IO Service

This directory contains a clean, reusable Socket.IO service for managing real-time events in the show/room pages.

## Problem

Previously, the show-view.tsx file had over 150 lines of socket event listeners mixed directly in the component, making it:
- Hard to read and maintain
- Difficult to test
- Not reusable across components
- Cluttered with socket management code

## Solution

The socket service provides a clean separation of concerns:

### Files Created

1. **`socket-service.ts`** - Core service class that handles all socket events
2. **`use-show-socket.ts`** - React hook for easy integration
3. **`socket-service.example.tsx`** - Example showing how to use it

## Usage

### Before (Messy)

```tsx
useEffect(() => {
  if (!socket || !id || !isConnected) return;

  joinRoom(id);

  socket.on('user-connected', (data) => {
    setViewers(prev => [...prev, data]);
  });
  
  socket.on('left-room', (data) => {
    setViewers(prev => prev.filter(v => v.userId !== data.userId));
  });
  
  socket.on('room-started', (room) => {
    queryClient.invalidateQueries({ queryKey: ['/api/rooms', id] });
    toast({ title: "Show Started!" });
  });
  
  // ... 10+ more event listeners ...

  return () => {
    socket.off('user-connected');
    socket.off('left-room');
    socket.off('room-started');
    // ... 10+ more cleanup calls ...
    leaveRoom(id);
  };
}, [socket, id, isConnected]);
```

### After (Clean)

```tsx
const { placeBid, joinGiveaway } = useShowSocket(showId, {
  onUserConnected: (data) => {
    setViewers(prev => [...prev, data]);
  },
  
  onUserLeft: (data) => {
    setViewers(prev => prev.filter(v => v.userId !== data.userId));
  },
  
  onRoomStarted: (room) => {
    queryClient.invalidateQueries({ queryKey: ['/api/rooms', showId] });
    toast({ title: "Show Started!" });
  },
  
  // ... all other handlers ...
});
```

## Available Event Handlers

The hook accepts these optional handlers matching the Flutter app:

### User Events
- `onUserConnected` - User joins the room
- `onCurrentUserJoined` - Current user successfully joined
- `onUserLeft` - User leaves the room
- `onFollowedUser` - User followed another user

### Room Events
- `onRoomStarted` - Show/room starts
- `onRoomEnded` - Show/room ends

### Product Events
- `onProductPinned` - Product is pinned
- `onPinnedProductUpdated` - Pinned product quantity changes

### Auction Events
- `onAuctionStarted` - Auction begins
- `onAuctionPinned` - Auction is pinned
- `onBidUpdated` - New bid placed
- `onAuctionTimeExtended` - Auction time extended (with server time)
- `onAuctionEnded` - Auction concludes
- `onAuctionError` - Auction error (payment failed, etc.)

### Giveaway Events
- `onGiveawayStarted` - Giveaway begins
- `onGiveawayJoined` - User joins giveaway
- `onGiveawayEnded` - Giveaway concludes

### Chat Events
- `onMessage` - New chat message

## Helper Methods

The hook returns these methods:

### Viewer Actions
- `placeBid(auctionId, amount, userId, userName)` - Place a bid on an auction
- `joinGiveaway(giveawayId, userId, userName)` - Join a giveaway
- `followUser(showId, userId, toFollowUserId)` - Follow a user in the show
- `sendMessage(message, senderName)` - Send a chat message
- `sendUserConnected(userId, userName)` - Send user connected event

### Host Actions (Host Only)
- `startAuction(auction, increaseBidBy?)` - Start an auction
- `startGiveaway(giveawayId, showId)` - Start a giveaway
- `endGiveaway(giveawayId, showId)` - End/draw a giveaway
- `pinProduct(productId, tokshowId, pinned)` - Pin/unpin a product
- `pinAuction(auctionId, tokshowId, pinned)` - Pin/unpin an auction
- `endRoom(data)` - End the room/show

### Connection Status
- `isConnected` - Socket connection status

## Benefits

✅ **Cleaner Components** - Remove 100+ lines of socket code from components
✅ **Type Safety** - Full TypeScript support with interfaces
✅ **Automatic Cleanup** - Handles all socket unsubscription automatically
✅ **Reusable** - Use the same service across multiple components
✅ **Testable** - Easy to mock and test
✅ **Maintainable** - All socket logic in one place

## Migration

To migrate show-view.tsx:

1. Remove the large `useEffect` with socket listeners
2. Add `useShowSocket` hook with event handlers
3. Use returned methods like `placeBid` and `joinGiveaway`
4. Enjoy cleaner, more maintainable code!

See `socket-service.example.tsx` for a complete example.
