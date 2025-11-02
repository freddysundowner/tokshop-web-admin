import { useState, useEffect, useRef } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search,
  Send,
  Image as ImageIcon,
  MoreVertical,
  ArrowLeft,
  Ban,
  Shield,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToChats, 
  subscribeToMessages, 
  sendMessage as sendFirebaseMessage,
  markMessagesAsRead,
  uploadImageToStorage,
  isImageMessage,
  blockUser,
  unblockUser,
  checkBlockStatus,
  updateOnlineStatus,
  updateTypingStatus,
  subscribeToPresence,
  subscribeToTypingStatus,
  type ConversationData,
  type ChatMessage
} from '@/lib/firebase-chat';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  isImage: boolean;
}

export default function Inbox() {
  const { user } = useAuth();
  const [, params] = useRoute("/inbox/:chatId?");
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Blocking state
  const [hasBlockedOther, setHasBlockedOther] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  
  // Presence state
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState('');
  
  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const { toast } = useToast();

  const userId = (user as any)?._id || user?.id || '';
  const userName = (user as any)?.userName || (user as any)?.firstName || 'User';
  const userProfileUrl = (user as any)?.profilePhoto || '';

  // Update current user's profile data in all their chats
  useEffect(() => {
    if (!userId || !userProfileUrl) return;
    
    // This will be called when opening inbox to ensure profile photos are current
    const updateUserProfileInChats = async () => {
      try {
        const chatsRef = collection(db, 'chats');
        const chatsQuery = query(chatsRef, where('userIds', 'array-contains', userId));
        const chatsSnapshot = await getDocs(chatsQuery);
        
        const updatePromises = chatsSnapshot.docs.map(async (chatDoc) => {
          try {
            const chatData = chatDoc.data();
            const users = chatData.users || [];
            
            // Update current user's profile photo if it's missing or different
            const updatedUsers = users.map((u: any) => {
              if (u.id === userId && u.profilePhoto !== userProfileUrl) {
                return { ...u, profilePhoto: userProfileUrl };
              }
              return u;
            });
            
            // Only update if there were changes
            if (JSON.stringify(users) !== JSON.stringify(updatedUsers)) {
              await updateDoc(doc(db, 'chats', chatDoc.id), { users: updatedUsers });
              console.log('Updated profile photo in chat:', chatDoc.id);
            }
          } catch (err) {
            console.error('Error updating chat:', chatDoc.id, err);
          }
        });
        
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error updating user profile in chats:', error);
      }
    };
    
    updateUserProfileInChats();
  }, [userId, userProfileUrl]);
  
  // Subscribe to chats
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToChats(
      userId,
      (chats) => {
        setConversations(chats);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      selectedConversation,
      (chatMessages) => {
        const formattedMessages: Message[] = chatMessages.map((msg) => ({
          id: msg.id,
          senderId: msg.sender,
          content: msg.message,
          timestamp: formatMessageTime(msg.date),
          isOwn: msg.sender === userId,
          isImage: isImageMessage(msg.message)
        }));
        setMessages(formattedMessages);
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (error) => {
        console.error('Error loading messages:', error);
      }
    );

    // Mark messages as read
    if (userId) {
      markMessagesAsRead(selectedConversation, userId);
    }

    return () => unsubscribe();
  }, [selectedConversation, userId]);
  
  // Check block status when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !userId) return;
    
    const selectedConv = conversations.find(c => c.id === selectedConversation);
    if (!selectedConv?.otherUserId) return;
    
    checkBlockStatus(userId, selectedConv.otherUserId).then(status => {
      setHasBlockedOther(status.hasBlockedOther);
      setIsBlockedByOther(status.isBlockedByOther);
    });
  }, [selectedConversation, userId, conversations]);
  
  // Subscribe to other user's presence
  useEffect(() => {
    if (!selectedConversation) return;
    
    const selectedConv = conversations.find(c => c.id === selectedConversation);
    if (!selectedConv?.otherUserId) return;
    
    const unsubscribe = subscribeToPresence(
      selectedConv.otherUserId,
      (presence) => {
        setOtherUserOnline(presence.online);
        setLastSeen(presence.lastSeen);
      }
    );
    
    return () => unsubscribe();
  }, [selectedConversation, conversations]);
  
  // Subscribe to typing status
  useEffect(() => {
    if (!selectedConversation) return;
    
    const selectedConv = conversations.find(c => c.id === selectedConversation);
    if (!selectedConv?.otherUserId) return;
    
    const unsubscribe = subscribeToTypingStatus(
      selectedConversation,
      selectedConv.otherUserId,
      (isTyping) => {
        setOtherUserTyping(isTyping);
      }
    );
    
    return () => unsubscribe();
  }, [selectedConversation, conversations]);
  
  // Update own online status
  useEffect(() => {
    if (!userId) return;
    
    // Set online when component mounts
    updateOnlineStatus(userId, true);
    
    // Set offline when component unmounts
    return () => {
      updateOnlineStatus(userId, false);
    };
  }, [userId]);
  
  // Handle typing indicator
  useEffect(() => {
    if (!selectedConversation || !userId) return;
    
    let typingTimeout: NodeJS.Timeout;
    
    if (messageText) {
      updateTypingStatus(selectedConversation, userId, true);
      
      typingTimeout = setTimeout(() => {
        updateTypingStatus(selectedConversation, userId, false);
      }, 3000);
    } else {
      updateTypingStatus(selectedConversation, userId, false);
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (selectedConversation) {
        updateTypingStatus(selectedConversation, userId, false);
      }
    };
  }, [messageText, selectedConversation, userId]);

  // Auto-select conversation when chatId is provided in URL
  useEffect(() => {
    const chatId = params?.chatId;
    
    if (chatId && conversations.length > 0) {
      // Check if the chatId exists in the loaded conversations
      const chatExists = conversations.some(c => c.id === chatId);
      
      if (chatExists) {
        setSelectedConversation(chatId);
        setShowMobileConversation(true);
      }
    }
  }, [params?.chatId, conversations]);

  const formatMessageTime = (date: string) => {
    const msgDate = new Date(parseInt(date));
    return msgDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const chatAccessBlocked = hasBlockedOther || isBlockedByOther;

  const handleSendMessage = async () => {
    if (messageText.trim() && selectedConversation && userId && !chatAccessBlocked && !sending) {
      setSending(true);
      const result = await sendFirebaseMessage(
        selectedConversation,
        messageText.trim(),
        userId,
        userName,
        userProfileUrl
      );
      
      if (result.success) {
        setMessageText('');
      } else {
        console.error('Failed to send message:', result.error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
      setSending(false);
    }
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !userId || chatAccessBlocked) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }
    
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageToStorage(file, userId);
      await sendFirebaseMessage(
        selectedConversation,
        imageUrl,
        userId,
        userName,
        userProfileUrl
      );
      toast({
        title: "Image sent",
        description: "Your image has been sent successfully."
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleBlockUser = async () => {
    if (!selectedConv?.otherUserId || !userId) return;
    
    setBlockingLoading(true);
    const success = await blockUser(userId, selectedConv.otherUserId);
    setBlockingLoading(false);
    setShowBlockDialog(false);
    
    if (success) {
      setHasBlockedOther(true);
      toast({
        title: "User blocked",
        description: `You have blocked ${selectedConv.userName}. They can no longer send you messages.`
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleUnblockUser = async () => {
    if (!selectedConv?.otherUserId || !userId) return;
    
    setBlockingLoading(true);
    const success = await unblockUser(userId, selectedConv.otherUserId);
    setBlockingLoading(false);
    setShowUnblockDialog(false);
    
    if (success) {
      setHasBlockedOther(false);
      toast({
        title: "User unblocked",
        description: `You have unblocked ${selectedConv.userName}.`
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to unblock user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConversationClick = (convId: string) => {
    setSelectedConversation(convId);
    setShowMobileConversation(true);
    // Update URL to reflect the selected conversation
    setLocation(`/inbox/${convId}`);
  };

  const handleBackToList = () => {
    setShowMobileConversation(false);
    setSelectedConversation(null);
    // Update URL to go back to inbox list
    setLocation('/inbox');
  };

  const getUserInitials = (userName: string) => {
    return userName.replace('@', '').substring(0, 2).toUpperCase();
  };

  return (
    <div className="h-full bg-background" data-testid="page-inbox">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <div className="flex justify-center w-full h-full">
        <div className="w-full lg:w-[90%] h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading chats...</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Conversations List */}
          <div
            className={cn(
              "lg:col-span-1 border-r border-border bg-card",
              showMobileConversation && "hidden lg:block"
            )}
          >
            <div className="p-4 border-b border-border">
              <h1 className="text-2xl font-bold mb-4" data-testid="text-inbox-title">
                Messages
              </h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationClick(conv.id)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover-elevate active-elevate-2 transition-colors text-left",
                      selectedConversation === conv.id && "bg-muted"
                    )}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.userAvatar} />
                        <AvatarFallback>{getUserInitials(conv.userName)}</AvatarFallback>
                      </Avatar>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          conv.unread ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {conv.userName}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {conv.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm truncate",
                          conv.unread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount && conv.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 flex-shrink-0 h-5 min-w-[20px] flex items-center justify-center">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div
            className={cn(
              "lg:col-span-2 flex flex-col",
              !showMobileConversation && "hidden lg:flex"
            )}
          >
            {selectedConv ? (
              <>
                {/* Message Header */}
                <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={handleBackToList}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Link href={`/profile/${selectedConv.otherUserId}`}>
                      <Avatar className="h-10 w-10 cursor-pointer hover-elevate">
                        <AvatarImage src={selectedConv.userAvatar} />
                        <AvatarFallback>{getUserInitials(selectedConv.userName)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link href={`/profile/${selectedConv.otherUserId}`}>
                        <p className="font-medium text-foreground hover:underline cursor-pointer" data-testid="text-conversation-user">
                          {selectedConv.userName}
                        </p>
                      </Link>
                      {!chatAccessBlocked && (
                        <>
                          {otherUserTyping && (
                            <p className="text-xs text-primary italic">typing...</p>
                          )}
                          {!otherUserTyping && otherUserOnline && (
                            <p className="text-xs text-green-600 dark:text-green-400">Online</p>
                          )}
                          {!otherUserTyping && !otherUserOnline && lastSeen && (
                            <p className="text-xs text-muted-foreground">Last seen {lastSeen}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-conversation-menu">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasBlockedOther ? (
                        <DropdownMenuItem 
                          onClick={() => setShowUnblockDialog(true)}
                          data-testid="menu-item-unblock"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Unblock User
                        </DropdownMenuItem>
                      ) : !isBlockedByOther && (
                        <DropdownMenuItem 
                          onClick={() => setShowBlockDialog(true)}
                          className="text-destructive"
                          data-testid="menu-item-block"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Block User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Block Status Messages */}
                {chatAccessBlocked && (
                  <div className="bg-destructive/10 border-y border-destructive/20 p-4 text-center">
                    {hasBlockedOther && (
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <Ban className="h-4 w-4" />
                        <span>
                          You blocked {selectedConv.userName}.{' '}
                          <button 
                            onClick={() => setShowUnblockDialog(true)}
                            className="underline font-medium"
                          >
                            Unblock
                          </button>
                        </span>
                      </div>
                    )}
                    {isBlockedByOther && (
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <Ban className="h-4 w-4" />
                        <span>You have been blocked by {selectedConv.userName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.isOwn ? "justify-end" : "justify-start"
                        )}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg",
                            msg.isImage ? "p-0" : "px-4 py-2",
                            msg.isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {msg.isImage ? (
                            <div className="relative">
                              <img
                                src={msg.content}
                                alt="Chat image"
                                className="rounded-lg max-w-full h-auto cursor-pointer"
                                onClick={() => setPreviewImage(msg.content)}
                                style={{ maxHeight: '300px' }}
                              />
                              <p
                                className={cn(
                                  "text-xs mt-1 px-2 pb-1",
                                  msg.isOwn
                                    ? "text-primary-foreground/70 text-right"
                                    : "text-muted-foreground"
                                )}
                              >
                                {msg.timestamp}
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={cn(
                                  "text-xs mt-1",
                                  msg.isOwn
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                {msg.timestamp}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                {!chatAccessBlocked && (
                  <div className="p-4 border-t border-border bg-card">
                    {uploadingImage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading image...</span>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        data-testid="button-attach-image"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <div className="flex-1">
                        <Input
                          placeholder="Type a message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sending || uploadingImage}
                          className="resize-none"
                          data-testid="input-message"
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sending || uploadingImage}
                        data-testid="button-send-message"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No conversation selected
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
          )}
        </div>
      </div>
      
      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {selectedConv?.userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to send you messages anymore. You can unblock them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockingLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser}
              disabled={blockingLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {blockingLoading ? 'Blocking...' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Unblock User Dialog */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {selectedConv?.userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to send you messages again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockingLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnblockUser}
              disabled={blockingLoading}
            >
              {blockingLoading ? 'Unblocking...' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center">
              <img
                src={previewImage}
                alt="Full size"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
