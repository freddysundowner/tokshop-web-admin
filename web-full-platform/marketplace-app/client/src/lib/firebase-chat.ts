import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export interface ChatMessage {
  id: string;
  message: string;
  date: string;
  sender: string;
  senderName: string;
  senderProfileUrl: string;
  seen: boolean;
  mentions?: Array<{ id: string; name: string }>;
}

export interface ChatUser {
  id: string;
  firstName: string;
  lastName?: string;
  userName?: string;
  profilePhoto?: string;
}

export interface Chat {
  id: string;
  lastMessage: string;
  lastMessageTime: Timestamp | string;
  lastSender: string;
  chat_disabled: boolean;
  userIds: string[];
  users: ChatUser[];
  // Dynamic field for unread tracking: last_read_[userId]
  [key: string]: any;
}

export interface ConversationData {
  id: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
  online?: boolean;
  otherUserId?: string;
}

// Subscribe to user's chats with presence integration
export function subscribeToChats(
  userId: string,
  onChatsUpdate: (chats: ConversationData[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const chatsRef = collection(db, 'chats');
    
    // Query for chats where the userId is in the userIds array
    const chatsQuery = query(
      chatsRef,
      where('userIds', 'array-contains', userId)
    );
    
    // Store presence unsubscribers
    const presenceUnsubscribers = new Map<string, () => void>();
    const presenceData = new Map<string, boolean>();
    
    const updateChatsWithPresence = async (snapshot: any) => {
      const chatPromises = snapshot.docs.map(async (chatDoc: any) => {
        const chatData = chatDoc.data() as Chat;
        const chatId = chatDoc.id;
        
        // Get the other user's ID from userIds array
        const otherUserId = chatData.userIds?.find(id => id !== userId) || '';
        
        // Get other user's info from users array
        const otherUser = chatData.users?.find(u => u.id === otherUserId);
        const otherUserName = otherUser?.userName || otherUser?.firstName || 'Unknown User';
        const otherUserAvatar = otherUser?.profilePhoto || '';
        
        // Check block status
        const blockStatus = await checkBlockStatus(userId, otherUserId);
        if (blockStatus.isBlockedByOther) {
          // Filter out chats where current user is blocked
          return null;
        }
        
        // Subscribe to presence for this user if not already subscribed
        if (otherUserId && !presenceUnsubscribers.has(otherUserId)) {
          const presenceRef = doc(db, 'presence', otherUserId);
          const unsubPresence = onSnapshot(presenceRef, (presenceDoc) => {
            const isOnline = presenceDoc.exists() && presenceDoc.data()?.online === true;
            presenceData.set(otherUserId, isOnline);
            // Trigger update when presence changes
            updateChatsWithPresence(snapshot);
          });
          presenceUnsubscribers.set(otherUserId, unsubPresence);
        }
        
        // Get the last read timestamp for this user
        const lastReadField = `last_read_${userId}`;
        const lastReadTimestamp = chatData[lastReadField] || 0;
        
        // Get messages to calculate unread count
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(
          messagesRef,
          orderBy('date', 'desc')
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChatMessage[];
        
        // Filter out messages from blocked users
        const filteredMessages = messages.filter(msg => msg.sender === userId || msg.sender === otherUserId);
        
        // Calculate unread count
        const unreadCount = filteredMessages.filter(msg => {
          const msgDate = typeof msg.date === 'string' ? parseInt(msg.date) : msg.date;
          return msg.sender !== userId && msgDate > lastReadTimestamp && !msg.seen;
        }).length;
        
        // Format timestamp
        const formatTimestamp = (ts: any) => {
          if (!ts) return '';
          
          let date: Date;
          if (ts instanceof Timestamp) {
            date = ts.toDate();
          } else if (typeof ts === 'string') {
            date = new Date(parseInt(ts));
          } else {
            date = new Date();
          }
          
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          if (diffMins < 1) return 'Just now';
          if (diffMins < 60) return `${diffMins}m ago`;
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays < 7) return `${diffDays}d ago`;
          return date.toLocaleDateString();
        };
        
        // Format last message - show friendly text for images
        const displayLastMessage = chatData.lastMessage 
          ? (isImageMessage(chatData.lastMessage) ? '📷 Photo' : chatData.lastMessage)
          : '';
        
        return {
          id: chatId,
          userName: otherUserName,
          userAvatar: otherUserAvatar,
          lastMessage: displayLastMessage,
          timestamp: formatTimestamp(chatData.lastMessageTime),
          unread: unreadCount > 0,
          unreadCount: unreadCount,
          online: presenceData.get(otherUserId) || false,
          otherUserId: otherUserId
        };
      });
      
      const chats = (await Promise.all(chatPromises)).filter(chat => chat !== null) as ConversationData[];
      
      // Filter out chats where user is not a participant
      const userChats = chats.filter(chat => chat.otherUserId);
      
      onChatsUpdate(userChats);
    };
    
    const unsubscribe = onSnapshot(
      chatsQuery,
      updateChatsWithPresence,
      (error) => {
        console.error('Error subscribing to chats:', error);
        if (onError) onError(error);
      }
    );
    
    // Return combined unsubscriber
    return () => {
      unsubscribe();
      presenceUnsubscribers.forEach(unsub => unsub());
      presenceUnsubscribers.clear();
      presenceData.clear();
    };
  } catch (error) {
    console.error('Error setting up chat subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

// Subscribe to messages in a specific chat
export function subscribeToMessages(
  chatId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChatMessage[];
        
        onMessagesUpdate(messages);
      },
      (error) => {
        console.error('Error subscribing to messages:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up messages subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

// Subscribe to room messages for a live show
export function subscribeToRoomMessages(
  showId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const messagesRef = collection(db, 'chats', showId, 'room_messages');
    
    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Normalize field names (some messages use 'name', some use 'senderName')
          const senderName = data.senderName || data.name || 'Unknown';
          const senderId = data.sender || data.senderId || '';
          const senderProfileUrl = data.senderProfileUrl || data.image_url || '';
          
          // Handle different timestamp formats
          let timestamp = 0;
          if (data.date) {
            timestamp = typeof data.date === 'string' ? parseInt(data.date) : data.date;
          } else if (data.timestamp) {
            // Handle Firestore Timestamp object
            if (data.timestamp.seconds) {
              timestamp = data.timestamp.seconds * 1000;
            } else if (typeof data.timestamp === 'number') {
              timestamp = data.timestamp;
            }
          }
          
          return {
            id: doc.id,
            message: data.message || '',
            sender: senderId,
            senderName: senderName,
            senderProfileUrl: senderProfileUrl,
            date: timestamp.toString(),
            seen: data.seen || false,
            mentions: data.mentions || []
          };
        }) as ChatMessage[];
        
        // Sort messages by timestamp (oldest first)
        const sortedMessages = messages.sort((a, b) => {
          const dateA = parseInt(a.date) || 0;
          const dateB = parseInt(b.date) || 0;
          return dateA - dateB;
        });
        
        onMessagesUpdate(sortedMessages);
      },
      (error) => {
        console.error('Error subscribing to room messages:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up room messages subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

// Send a message to a live show room
export async function sendRoomMessage(
  showId: string,
  message: string,
  senderId: string,
  senderName: string,
  senderProfileUrl: string = '',
  mentions: Array<{ id: string; name: string }> = []
) {
  try {
    const messagesRef = collection(db, 'chats', showId, 'room_messages');
    
    const newMessage = {
      message,
      sender: senderId,
      senderName,
      senderProfileUrl,
      date: Date.now().toString(),
      seen: false,
      mentions
    };
    
    await addDoc(messagesRef, newMessage);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending room message:', error);
    return { success: false, error };
  }
}

// Send a message with block checking and user profile update
export async function sendMessage(
  chatId: string,
  message: string,
  senderId: string,
  senderName: string,
  senderProfileUrl: string
) {
  try {
    // Get chat to find other user
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return { success: false, error: 'Chat not found' };
    }
    
    const chatData = chatDoc.data() as Chat;
    const otherUserId = chatData.userIds?.find(id => id !== senderId);
    
    if (otherUserId) {
      // Check if either user has blocked the other
      const blockStatus = await checkBlockStatus(senderId, otherUserId);
      if (blockStatus.hasBlockedOther || blockStatus.isBlockedByOther) {
        return { success: false, error: 'Cannot send message - user is blocked' };
      }
    }
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    
    const newMessage = {
      message,
      sender: senderId,
      senderName,
      senderProfileUrl,
      date: Date.now().toString(),
      seen: false
    };
    
    // Add message to subcollection
    await addDoc(messagesRef, newMessage);
    
    // Update sender's profile data in the users array
    const updatedUsers = chatData.users?.map(u => {
      if (u.id === senderId) {
        return {
          ...u,
          profilePhoto: senderProfileUrl || u.profilePhoto
        };
      }
      return u;
    }) || [];
    
    // Update chat document with last message info and updated user profile
    await updateDoc(chatRef, {
      lastMessage: isImageMessage(message) ? '📷 Photo' : message,
      lastMessageTime: serverTimestamp(),
      lastSender: senderId,
      users: updatedUsers
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
}

// Mark messages as read
export async function markMessagesAsRead(chatId: string, userId: string) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const updateData = {
      [`last_read_${userId}`]: Date.now()
    };
    
    await updateDoc(chatRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error };
  }
}

// Get or create a chat between two users
export async function getOrCreateChat(
  userId1: string, 
  userId2: string,
  user1Data?: { firstName: string; lastName?: string; userName?: string; profilePhoto?: string },
  user2Data?: { firstName: string; lastName?: string; userName?: string; profilePhoto?: string }
): Promise<string> {
  try {
    // Try to find existing chat using userIds array
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('userIds', 'array-contains', userId1));
    const snapshot = await getDocs(q);
    
    // Check if any chat contains both users
    for (const chatDoc of snapshot.docs) {
      const chatData = chatDoc.data();
      if (chatData.userIds && chatData.userIds.includes(userId2)) {
        return chatDoc.id;
      }
    }
    
    // If no existing chat found, create a new one
    const newChatRef = await addDoc(chatsRef, {
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastSender: '',
      chat_disabled: false,
      userIds: [userId1, userId2],
      users: [
        {
          id: userId1,
          firstName: user1Data?.firstName || '',
          lastName: user1Data?.lastName || '',
          userName: user1Data?.userName || '',
          profilePhoto: user1Data?.profilePhoto || ''
        },
        {
          id: userId2,
          firstName: user2Data?.firstName || '',
          lastName: user2Data?.lastName || '',
          userName: user2Data?.userName || '',
          profilePhoto: user2Data?.profilePhoto || ''
        }
      ],
      [`last_read_${userId1}`]: 0,
      [`last_read_${userId2}`]: 0
    });
    
    return newChatRef.id;
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    throw error;
  }
}

// Upload image to Firebase Storage
export async function uploadImageToStorage(file: File, senderId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `${senderId}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `chat_images/${fileName}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Check if message is an image URL
export function isImageMessage(message: string): boolean {
  return message.toLowerCase().includes('firebasestorage') ||
    message.toLowerCase().endsWith('.jpg') ||
    message.toLowerCase().endsWith('.jpeg') ||
    message.toLowerCase().endsWith('.png') ||
    message.toLowerCase().endsWith('.gif') ||
    message.toLowerCase().endsWith('.webp');
}

// Block a user
export async function blockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const blockRef = doc(db, 'blocked_users', currentUserId);
    
    await setDoc(blockRef, {
      blockedUsers: arrayUnion(targetUserId)
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error blocking user:', error);
    return false;
  }
}

// Unblock a user
export async function unblockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const blockRef = doc(db, 'blocked_users', currentUserId);
    
    await updateDoc(blockRef, {
      blockedUsers: arrayRemove(targetUserId)
    });
    
    return true;
  } catch (error) {
    console.error('Error unblocking user:', error);
    return false;
  }
}

// Check if user is blocked
export async function checkBlockStatus(currentUserId: string, otherUserId: string): Promise<{
  hasBlockedOther: boolean;
  isBlockedByOther: boolean;
}> {
  try {
    // Check if current user has blocked the other user
    const currentUserBlockRef = doc(db, 'blocked_users', currentUserId);
    const currentUserBlockDoc = await getDoc(currentUserBlockRef);
    const hasBlockedOther = currentUserBlockDoc.exists() && 
      currentUserBlockDoc.data()?.blockedUsers?.includes(otherUserId);
    
    // Check if current user is blocked by the other user
    const otherUserBlockRef = doc(db, 'blocked_users', otherUserId);
    const otherUserBlockDoc = await getDoc(otherUserBlockRef);
    const isBlockedByOther = otherUserBlockDoc.exists() && 
      otherUserBlockDoc.data()?.blockedUsers?.includes(currentUserId);
    
    return { hasBlockedOther, isBlockedByOther };
  } catch (error) {
    console.error('Error checking block status:', error);
    return { hasBlockedOther: false, isBlockedByOther: false };
  }
}

// Update online status with better lifecycle management
export async function updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  try {
    const presenceRef = doc(db, 'presence', userId);
    
    await setDoc(presenceRef, {
      online: isOnline,
      lastSeen: serverTimestamp(),
      lastUpdate: Date.now()
    }, { merge: true });
    
    // If going online, set up periodic heartbeat
    if (isOnline && typeof window !== 'undefined') {
      // Update every 30 seconds to show we're still active
      const heartbeatInterval = setInterval(async () => {
        try {
          await setDoc(presenceRef, {
            lastUpdate: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error('Heartbeat error:', error);
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      // Store interval ID for cleanup
      (window as any).__presenceHeartbeat = heartbeatInterval;
      
      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.hidden) {
          updateOnlineStatus(userId, false);
        } else {
          updateOnlineStatus(userId, true);
        }
      };
      
      // Handle beforeunload
      const handleBeforeUnload = () => {
        // Use sendBeacon for reliable offline status update
        const data = JSON.stringify({
          userId,
          online: false,
          timestamp: Date.now()
        });
        navigator.sendBeacon('/api/presence/offline', data);
        
        // Also try sync update
        updateOnlineStatus(userId, false);
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Store cleanup function
      (window as any).__presenceCleanup = () => {
        clearInterval(heartbeatInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else if (!isOnline && typeof window !== 'undefined') {
      // Clean up heartbeat when going offline
      if ((window as any).__presenceHeartbeat) {
        clearInterval((window as any).__presenceHeartbeat);
        delete (window as any).__presenceHeartbeat;
      }
      if ((window as any).__presenceCleanup) {
        (window as any).__presenceCleanup();
        delete (window as any).__presenceCleanup;
      }
    }
  } catch (error) {
    console.error('Error updating online status:', error);
  }
}

// Update typing status
export async function updateTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    
    await updateDoc(chatRef, {
      [`typing_${userId}`]: isTyping
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
}

// Subscribe to presence (online/typing/last seen)
export function subscribeToPresence(
  userId: string,
  onPresenceUpdate: (data: { online: boolean; lastSeen: string; typing: boolean }) => void,
  onError?: (error: Error) => void
) {
  try {
    const presenceRef = doc(db, 'presence', userId);
    
    const unsubscribe = onSnapshot(
      presenceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const lastSeen = data.lastSeen instanceof Timestamp 
            ? formatLastSeen(data.lastSeen.toDate())
            : '';
          
          onPresenceUpdate({
            online: data.online || false,
            lastSeen,
            typing: false // Typing is chat-specific, not in presence
          });
        } else {
          onPresenceUpdate({ online: false, lastSeen: '', typing: false });
        }
      },
      (error) => {
        console.error('Error subscribing to presence:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up presence subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

// Subscribe to typing status for a specific chat
export function subscribeToTypingStatus(
  chatId: string,
  otherUserId: string,
  onTypingUpdate: (isTyping: boolean) => void,
  onError?: (error: Error) => void
) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    
    const unsubscribe = onSnapshot(
      chatRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const typingField = `typing_${otherUserId}`;
          onTypingUpdate(data[typingField] || false);
        }
      },
      (error) => {
        console.error('Error subscribing to typing status:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up typing subscription:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

// Format last seen timestamp
function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'yesterday';
  }
  
  return date.toLocaleDateString();
}
