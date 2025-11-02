import { Link, useParams, useLocation } from 'wouter';
import { Search, Send, Volume2, VolumeX, Share2, Menu, X, Clock, Users, DollarSign, Gift, Truck, AlertTriangle, ShoppingBag, MessageCircle, Star, Wallet, MoreVertical, Edit, Trash, Play, Plus, Loader2, Bookmark, Link as LinkIcon, MoreHorizontal, Radio, User, Mail, AtSign, Ban, Flag, ChevronRight, Video, VideoOff, Mic, MicOff, FileText, Sparkles, Skull, Package } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { PaymentShippingSheet } from '@/components/payment-shipping-sheet';
import { BuyNowDialog } from '@/components/buy-now-dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { ProductForm } from '@/components/product-form';
import { cn } from '@/lib/utils';
import { subscribeToRoomMessages, sendRoomMessage } from '@/lib/firebase-chat';
import { useLiveKit } from '@/hooks/use-livekit';
import { LiveKitVideoPlayer } from '@/components/livekit-video-player';

export default function ShowViewNew() {
  usePageTitle('Live Show');
  const { settings } = useSettings();
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const { toast } = useToast();
  const { id } = useParams();
  const [, navigate] = useLocation();
  
  // UI State
  const [message, setMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('Chat');
  const [productTab, setProductTab] = useState('Auction');
  const [showMobileProducts, setShowMobileProducts] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [productActionSheet, setProductActionSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [addProductType, setAddProductType] = useState<'auction' | 'buy_now' | 'giveaway'>('buy_now');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isNotificationSaved, setIsNotificationSaved] = useState(false);
  const [showUserActionsDialog, setShowUserActionsDialog] = useState(false);
  const [showMoreOptionsSheet, setShowMoreOptionsSheet] = useState(false);
  const [isEndingShow, setIsEndingShow] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [showMentionDialog, setShowMentionDialog] = useState(false);
  const [showAuctionSettingsDialog, setShowAuctionSettingsDialog] = useState(false);
  const [auctionSettings, setAuctionSettings] = useState({
    startingPrice: 0,
    duration: 10,
    sudden: false,
    counterBidTime: 5
  });
  
  // Real-time State
  const [viewers, setViewers] = useState<any[]>([]);
  const [pinnedProduct, setPinnedProduct] = useState<any>(null);
  const [activeAuction, setActiveAuction] = useState<any>(null);
  const [activeGiveaway, setActiveGiveaway] = useState<any>(null);
  const [auctionTimeLeft, setAuctionTimeLeft] = useState<number>(0);
  const [giveawayTimeLeft, setGiveawayTimeLeft] = useState<number>(0);
  const [bidAmount, setBidAmount] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [shippingEstimate, setShippingEstimate] = useState<any>(null);
  const [winningUser, setWinningUser] = useState<any>(null);
  const [winningCurrentPrice, setWinningCurrentPrice] = useState<number>(0);
  const [timeAddedBlink, setTimeAddedBlink] = useState<boolean>(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState<boolean>(false);
  const [winnerData, setWinnerData] = useState<any>(null);
  const [showGiveawayWinnerDialog, setShowGiveawayWinnerDialog] = useState<boolean>(false);
  const [giveawayWinnerData, setGiveawayWinnerData] = useState<any>(null);
  
  // Payment & Shipping Alert
  const [showPaymentShippingAlert, setShowPaymentShippingAlert] = useState<boolean>(false);
  const hasShownPaymentAlertRef = useRef<boolean>(false);
  
  // Buy Now Dialog
  const [showBuyNowDialog, setShowBuyNowDialog] = useState<boolean>(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  
  // Order Detail Dialog
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Track if join message has been sent
  const hasJoinedRef = useRef(false);
  const auctionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for auto-scrolling chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Mention/tagging state
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [currentMentions, setCurrentMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Set mobile viewport height accounting for browser chrome
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
  
  // Follow state - track locally
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  
  // LiveKit state
  const [livekitEnabled, setLivekitEnabled] = useState(false);
  
  // Host conflict detection
  const [showHostConflictDialog, setShowHostConflictDialog] = useState(false);
  const [conflictingShow, setConflictingShow] = useState<any>(null);
  const [proceedWithJoin, setProceedWithJoin] = useState(false);
  
  // Fetch single show from API
  const currentUserId = (user as any)?._id || user?.id;
  const { data: show, isLoading } = useQuery<any>({
    queryKey: ['/api/rooms', id, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentUserId) {
        params.set('currentUserId', currentUserId);
      }
      const url = `/api/rooms/${id}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch show');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch auction products for this show
  const { data: auctionProductsData, refetch: refetchAuction } = useQuery<any>({
    queryKey: ['/api/products', id, 'auction'],
    queryFn: async () => {
      const params = new URLSearchParams({
        roomId: id!,
        saletype: 'auction',
        status: 'active',
        page: '1',
        limit: '50'
      });
      const url = `/api/products?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return { products: [] };
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch buy now products for this show
  const { data: buyNowProductsData, refetch: refetchBuyNow } = useQuery<any>({
    queryKey: ['/api/products', id, 'buy_now'],
    queryFn: async () => {
      const params = new URLSearchParams({
        roomId: id!,
        saletype: 'buy_now',
        status: 'active',
        page: '1',
        limit: '50'
      });
      const url = `/api/products?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return { products: [] };
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch sold orders for this show
  const { data: soldOrdersData, refetch: refetchSold } = useQuery<any>({
    queryKey: ['/api/orders', id, 'sold'],
    queryFn: async () => {
      const params = new URLSearchParams({
        tokshow: id!,
        page: '1',
        limit: '50'
      });
      const url = `/api/orders?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return { orders: [] };
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch giveaways for this show
  const { data: giveawaysData, refetch: refetchGiveaways } = useQuery<any>({
    queryKey: ['/api/giveaways', id],
    queryFn: async () => {
      const params = new URLSearchParams({
        room: id!,
        page: '1',
        limit: '20'
      });
      const url = `/api/giveaways?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return { giveaways: [] };
      return response.json();
    },
    enabled: !!id,
  });

  // Initialize viewers from show data
  useEffect(() => {
    if (show?.viewers && Array.isArray(show.viewers)) {
      console.log('👥 Initializing viewers from show data:', show.viewers.length);
      setViewers(show.viewers);
    }
  }, [show?.viewers]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Helper: Find winner from bids (highest bidder)
  const findWinner = (bids: any[]) => {
    console.log('🏆 findWinner called with bids:', bids);
    
    if (!bids || bids.length === 0) {
      console.log('  ❌ No bids, clearing winner');
      setWinningUser(null);
      setWinningCurrentPrice(0);
      return null;
    }
    
    const allBidAmounts = bids.map(bid => bid.amount);
    const highestBid = Math.max(...allBidAmounts);
    const winningBid = bids.find(bid => bid.amount === highestBid);
    
    console.log('  🎯 Highest bid:', highestBid);
    console.log('  🎯 Winning bid:', winningBid);
    console.log('  👤 Winner user:', winningBid?.user);
    
    // Bids have a 'user' field, not 'bidder'
    const winner = winningBid?.user || winningBid?.bidder;
    setWinningUser(winner);
    setWinningCurrentPrice(highestBid);
    
    console.log('  ✅ Set winningUser to:', winner);
    
    return winningBid;
  };

  // Helper: Get shipping estimate
  const getShippingEstimate = async (auction: any) => {
    if (!auction?.product?.shipping_profile || !currentUserId) {
      console.log('🚫 Skipping shipping estimate:', {
        hasShippingProfile: !!auction?.product?.shipping_profile,
        hasCurrentUserId: !!currentUserId
      });
      return;
    }
    
    try {
      const payload = {
        weight: auction.product.shipping_profile.weight,
        unit: auction.product.shipping_profile.scale,
        product: auction.product._id || auction.product.id,
        update: true,
        owner: show?.owner?._id || show?.owner?.id,
        customer: currentUserId,
        tokshow: id
      };
      
      console.log('📦 Fetching shipping estimate with payload:', payload);
      
      const response = await fetch('/api/shipping/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Shipping estimate received:', data);
        setShippingEstimate({
          amount: data.amount,
          currency: data.currency,
          rate_id: data.objectId,
          bundleId: data.bundleId,
          totalWeightOz: data.totalWeightOz,
          seller_shipping_fee_pay: data.seller_shipping_fee_pay,
          servicelevel: data.servicelevel?.name || ''
        });
      } else {
        console.error('❌ Shipping estimate failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error getting shipping estimate:', error);
    }
  };

  // Helper: Start timer with endTime and server offset
  const startTimerWithEndTime = (auction: any) => {
    // Cancel existing timer
    if (auctionTimerRef.current) {
      clearInterval(auctionTimerRef.current);
    }
    
    // Don't start timer if no endTime
    if (!auction.endTime) {
      console.log('⚠️ Cannot start timer: no endTime in auction', auction._id);
      return;
    }
    
    console.log('⏰ Starting timer with endTime:', auction.endTime, 'Current time:', Date.now());
    
    const serverOffset = auction.serverOffset || 0;
    
    auctionTimerRef.current = setInterval(() => {
      // Get current endTime from state instead of closure
      setActiveAuction((currentAuction: any) => {
        if (!currentAuction || !currentAuction.endTime) {
          if (auctionTimerRef.current) {
            clearInterval(auctionTimerRef.current);
          }
          setAuctionTimeLeft(0);
          return currentAuction;
        }
        
        const adjustedNow = Date.now() + (currentAuction.serverOffset || serverOffset);
        const remaining = Math.floor((currentAuction.endTime - adjustedNow) / 1000);
        
        if (remaining <= 0) {
          setAuctionTimeLeft(0);
          if (auctionTimerRef.current) {
            clearInterval(auctionTimerRef.current);
          }
          return { ...currentAuction, ended: true };
        } else {
          setAuctionTimeLeft(remaining);
          return currentAuction;
        }
      });
    }, 1000);
  };

  // Reset join flag when room ID changes
  useEffect(() => {
    hasJoinedRef.current = false;
    setImageError(false); // Reset image error state
  }, [id]);

  // Check if user is already in invitedhostIds when show data loads
  useEffect(() => {
    if (show && currentUserId) {
      const invitedIds = show.invitedhostIds || show.invited_host_ids || [];
      setIsNotificationSaved(invitedIds.includes(currentUserId));
    }
  }, [show, currentUserId]);

  // Initialize activeAuction, activeGiveaway, and pinnedProduct from show data (for page refresh)
  useEffect(() => {
    if (show) {
      const showActiveAuction = show.activeauction || show.activeAuction || show.active_auction;
      if (showActiveAuction) {
        console.log('📦 Initializing active auction from show data:', showActiveAuction);
        console.log('🔍 Show activeauction bids:', showActiveAuction.bids);
        console.log('🔍 Show activeauction ended:', showActiveAuction.ended);
        console.log('🔍 Full show object keys:', Object.keys(show));
        
        // Calculate endTime if not present
        if (!showActiveAuction.endTime && showActiveAuction.duration > 0) {
          showActiveAuction.endTime = Date.now() + (showActiveAuction.duration * 1000);
        }
        
        setActiveAuction(showActiveAuction);
        
        // Find winner and get shipping estimate for existing auction
        findWinner(showActiveAuction.bids || []);
        getShippingEstimate(showActiveAuction);
      }
      
      const showActiveGiveaway = show.pinned_giveaway || show.pinnedGiveaway || show.activegiveaway || show.activeGiveaway || show.active_giveaway;
      if (showActiveGiveaway) {
        console.log('📦 Initializing active giveaway from show data:', showActiveGiveaway);
        setActiveGiveaway(showActiveGiveaway);
      }
      
      // Initialize pinned product from show data
      if (show.pinned) {
        console.log('📌 Initializing pinned product from show data:', show.pinned);
        setPinnedProduct(show.pinned);
        
        // Get shipping estimate for pinned product
        if (show.pinned.shipping_profile) {
          const pinnedPayload = {
            weight: show.pinned.shipping_profile.weight,
            unit: show.pinned.shipping_profile.scale,
            product: show.pinned._id || show.pinned.id,
            update: true,
            owner: show?.owner?._id || show?.owner?.id,
            customer: currentUserId,
            tokshow: id
          };
          
          console.log('📦 Fetching shipping estimate for pinned product:', pinnedPayload);
          
          fetch('/api/shipping/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pinnedPayload)
          })
            .then(res => res.json())
            .then(data => {
              console.log('✅ Pinned product shipping estimate received:', data);
              setShippingEstimate({
                amount: data.amount,
                currency: data.currency,
                rate_id: data.objectId,
                bundleId: data.bundleId,
              });
            })
            .catch(err => console.error('❌ Error fetching pinned product shipping:', err));
        }
      } else {
        setPinnedProduct(null);
      }
    }
  }, [show]);

  // Auto-connect to LiveKit if show has already started
  useEffect(() => {
    console.log('🎥 Auto-connect check:', {
      hasShow: !!show,
      status: show?.status,
      started: show?.started,
      ended: show?.ended,
      willConnect: show && show.started === true && !show?.ended
    });
    
    // Don't enable LiveKit if show has ended
    if (show?.ended) {
      console.log('❌ Show has ended, not enabling LiveKit');
      setLivekitEnabled(false);
      return;
    }
    
    // Don't enable LiveKit if show hasn't started
    if (show && !show.started) {
      console.log('❌ Show has not started yet, not enabling LiveKit');
      setLivekitEnabled(false);
      return;
    }
    
    if (show && show.started === true) {
      console.log('✅ Auto-enabling LiveKit connection');
      setLivekitEnabled(true);
    }
  }, [show]);

  // Check for host conflicts before joining room
  useEffect(() => {
    if (!socket || !id || !isConnected) return;
    
    // If user is not authenticated, allow immediate join
    if (!isAuthenticated || !currentUserId) {
      setProceedWithJoin(true);
      return;
    }
    
    // Check if user has an active show running
    const checkActiveShows = async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "10",
          userid: currentUserId,
          currentUserId: currentUserId,
          status: "active"
        });
        
        const response = await fetch(`/api/rooms?${params.toString()}`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          setProceedWithJoin(true);
          return;
        }
        
        const data = await response.json();
        const activeShows = data.rooms || [];
        
        // Find shows where user is the owner and show has started but not ended
        const userActiveShows = activeShows.filter((s: any) => {
          const ownerId = s.owner?._id || s.owner?.id;
          return ownerId === currentUserId && s.started === true && !s.ended;
        });
        
        // If user has an active show and is trying to join a different one
        if (userActiveShows.length > 0 && userActiveShows[0]._id !== id) {
          console.log('⚠️ Host conflict detected:', {
            activeShow: userActiveShows[0]._id,
            attemptingToJoin: id
          });
          setConflictingShow(userActiveShows[0]);
          setShowHostConflictDialog(true);
          return; // Don't join yet
        }
        
        // No conflict, proceed with joining
        setProceedWithJoin(true);
      } catch (error) {
        console.error('Error checking active shows:', error);
        // On error, allow joining anyway
        setProceedWithJoin(true);
      }
    };
    
    checkActiveShows();
  }, [socket, id, isConnected, isAuthenticated, currentUserId]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!socket || !id || !isConnected) return;
    
    // Only join if we have permission (no conflict or user confirmed)
    if (!proceedWithJoin) return;

    // Join room
    joinRoom(id);
    
    console.log('✅ Socket event listeners registered for room:', id);

    // Send join message (only for authenticated users and only once)
    if (isAuthenticated && user && !hasJoinedRef.current && currentUserId) {
      hasJoinedRef.current = true;
      const userName = (user as any).userName || user.firstName || 'Guest';
      const userPhoto = (user as any).profilePhoto || '';
      
      sendRoomMessage(
        id,
        'joined 👋',
        currentUserId,
        userName,
        userPhoto
      );
    }

    // User connected
    socket.on('user-connected', (data: any) => {
      console.log('👤 User connected:', data);
      setViewers(prev => {
        // Filter out existing user by checking both _id and userId fields
        const filtered = prev.filter(v => (v._id || v.userId) !== data.userId);
        const updated = [...filtered, { _id: data.userId, userId: data.userId, userName: data.userName }];
        console.log('👥 Viewers updated:', { previous: prev.length, new: updated.length, viewers: updated });
        return updated;
      });
    });

    // User disconnected
    socket.on('left-room', (data: any) => {
      console.log('User left:', data);
      setViewers(prev => prev.filter(v => (v._id || v.userId) !== data.userId));
    });

    // Room started - receives full room object (like Flutter)
    socket.on('room-started', (roomData: any) => {
      console.log('Room started - full room data:', roomData);
      // Refresh the room data to get updated started status
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
      toast({
        title: "Show Started!",
        description: "The live show has begun.",
        duration: 3000
      });
    });

    // Room ended
    socket.on('room-ended', () => {
      console.log('Room ended');
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
      toast({
        title: "Show Ended",
        description: "Thanks for watching!",
        variant: "destructive"
      });
    });

    // Product pinned - receives entire room object from server (like Flutter)
    socket.on('product-pinned', (roomData: any) => {
      console.log('Product pinned - full room data:', roomData);
      // Refresh the entire room data
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
      
      // Set pinned product from room data
      if (roomData.pinned || roomData.pinnedProduct) {
        const pinnedProd = roomData.pinned || roomData.pinnedProduct;
        setPinnedProduct(pinnedProd);
        
        // Get shipping estimate for pinned product
        if (pinnedProd.shipping_profile) {
          const pinnedPayload = {
            weight: pinnedProd.shipping_profile.weight,
            unit: pinnedProd.shipping_profile.scale,
            product: pinnedProd._id || pinnedProd.id,
            update: true,
            owner: roomData?.owner?._id || roomData?.owner?.id,
            customer: currentUserId,
            tokshow: id
          };
          
          console.log('📦 Fetching shipping estimate for pinned product:', pinnedPayload);
          
          fetch('/api/shipping/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pinnedPayload)
          })
            .then(res => res.json())
            .then(data => {
              console.log('✅ Pinned product shipping estimate received:', data);
              setShippingEstimate({
                amount: data.amount,
                currency: data.currency,
                rate_id: data.objectId,
                bundleId: data.bundleId,
              });
            })
            .catch(err => console.error('❌ Error fetching pinned product shipping:', err));
        }
      } else {
        setPinnedProduct(null);
      }
    });

    // Pinned product updated - receives quantity update
    socket.on('updated-pinned-product', (data: any) => {
      console.log('Pinned product updated:', data);
      if (data !== null && data !== undefined) {
        if (data.quantity !== null && data.quantity !== undefined) {
          setPinnedProduct((prev: any) => prev ? { ...prev, quantity: data.quantity } : null);
        } else {
          setPinnedProduct(null);
        }
      } else {
        setPinnedProduct(null);
      }
    });

    // Auction started
    socket.on('auction-started', (auctionData: any) => {
      console.log('🎉 AUCTION-STARTED EVENT RECEIVED BY HOST:', auctionData);
      
      // Calculate endTime if not present (currentTime + duration in seconds)
      if (!auctionData.endTime && auctionData.duration > 0) {
        auctionData.endTime = Date.now() + (auctionData.duration * 1000);
      }
      
      // Mark auction as not ended
      auctionData.ended = false;
      
      // Set as active auction
      setActiveAuction(auctionData);
      setPinnedProduct(null); // Clear pinned product when auction starts
      
      // Find winner from bids
      findWinner(auctionData.bids || []);
      
      // Reset timer display
      setAuctionTimeLeft(0);
      
      // Start timer with endTime
      startTimerWithEndTime(auctionData);
      
      // Get shipping estimate
      getShippingEstimate(auctionData);
    });

    // Auction pinned - receives auction object
    socket.on('auction-pinned', (auction: any) => {
      console.log('Auction pinned:', auction);
      setActiveAuction(auction);
      setPinnedProduct(null); // Clear pinned product when auction is pinned
    });

    // Bid updated - Only update bid-related fields, preserve timing fields
    socket.on('bid-updated', (auction: any) => {
      console.log('🔍 BID-UPDATED RECEIVED:');
      console.log('  Full auction object:', auction);
      console.log('  Has endTime?:', auction.endTime);
      console.log('  Has serverOffset?:', auction.serverOffset);
      console.log('  Has serverTime?:', auction.serverTime);
      console.log('  Has duration?:', auction.duration);
      console.log('  Bids count:', auction.bids?.length);
      console.log('  newbaseprice:', auction.newbaseprice);
      
      // Only update bid-related fields, don't replace entire auction object
      setActiveAuction((prev: any) => {
        if (!prev) {
          console.log('  ⚠️ No previous auction, keeping prev');
          return prev;
        }
        
        console.log('  Previous endTime:', prev.endTime);
        console.log('  Previous serverOffset:', prev.serverOffset);
        
        // Only update bid information, preserve all timing fields
        const updated = {
          ...prev,
          bids: auction.bids || prev.bids,
          higestbid: auction.higestbid !== undefined ? auction.higestbid : prev.higestbid,
          newbaseprice: auction.newbaseprice !== undefined ? auction.newbaseprice : prev.newbaseprice,
          // DON'T touch: endTime, serverOffset, serverTime, duration
        };
        
        console.log('  Updated auction endTime:', updated.endTime);
        console.log('  Updated auction serverOffset:', updated.serverOffset);
        
        return updated;
      });
      
      // Find new winner from updated bids
      findWinner(auction.bids || []);
    });

    // Auction time extended
    socket.on('auction-time-extended', (data: any) => {
      console.log('Auction time extended:', data);
      
      const newEndTimeMs = data.newEndTime; // int
      const serverTime = data.serverTime; // int
      
      // Use functional state update to avoid stale closure
      setActiveAuction((prev: any) => {
        if (!prev) return prev;
        
        const updated = {
          ...prev,
          endTime: newEndTimeMs,
        };
        
        // Handle server time and offset if provided
        if (serverTime) {
          updated.serverTime = serverTime;
          updated.serverOffset = serverTime - Date.now();
        }
        
        // Restart timer with new end time
        startTimerWithEndTime(updated);
        
        return updated;
      });
      
      // Blink effect to show time was added
      setTimeAddedBlink(true);
      setTimeout(() => {
        setTimeAddedBlink(false);
      }, 1000);
    });

    // Auction ended
    socket.on('auction-ended', (auction: any) => {
      console.log('🏁 AUCTION-ENDED RECEIVED:');
      console.log('  Full auction object:', auction);
      console.log('  Has winner?:', auction.winner);
      console.log('  higestbid:', auction.higestbid);
      console.log('  Bids count:', auction.bids?.length);
      console.log('  Bids array:', auction.bids);
      
      setActiveAuction(auction);
      
      // Use findWinner to determine the winner
      const winner = findWinner(auction.bids || []);
      
      if (winner) {
        const winnerName = winner.user?.userName || winner.bidder?.userName || 'Someone';
        const winAmount = winner.amount || auction.higestbid || auction.newbaseprice;
        
        console.log('🎉 Showing winner modal:', { winnerName, winAmount, user: winner.user });
        
        // Show winner announcement modal with profile picture
        setWinnerData({
          name: winnerName,
          amount: winAmount,
          profileImage: winner.user?.profileUrl || winner.user?.profilePicture || winner.user?.photoURL,
          user: winner.user
        });
        setShowWinnerDialog(true);
        
        // Auto-hide winner dialog after 5 seconds (but keep active auction visible)
        setTimeout(() => {
          setShowWinnerDialog(false);
        }, 5000);
      }
      
      // Refetch auctions to update the list
      refetchAuction();
    });

    // Giveaway started
    socket.on('started-giveaway', (giveaway: any) => {
      console.log('Giveaway started:', giveaway);
      setActiveGiveaway(giveaway);
      toast({
        title: "Giveaway Started!",
        description: giveaway.name || "New giveaway"
      });
    });

    // Giveaway joined
    socket.on('joined-giveaway', (giveaway: any) => {
      console.log('Giveaway joined:', giveaway);
      setActiveGiveaway(giveaway);
    });

    // Giveaway ended
    socket.on('ended-giveaway', (giveaway: any) => {
      console.log('Giveaway ended:', giveaway);
      
      // Show winner announcement overlay if there is a winner
      if (giveaway.winner) {
        const winnerName = giveaway.winner.userName || giveaway.winner.firstName || 'Someone';
        const winnerProfile = giveaway.winner.profilePhoto || giveaway.winner.profileUrl || giveaway.winner.profilePicture;
        
        console.log('🎁 Showing giveaway winner overlay:', { winnerName, winnerProfile, winner: giveaway.winner });
        
        // Show winner announcement overlay with profile picture
        setGiveawayWinnerData({
          name: winnerName,
          profileImage: winnerProfile,
          giveawayName: giveaway.name || 'Giveaway'
        });
        setShowGiveawayWinnerDialog(true);
        
        // Auto-hide winner dialog after 10 seconds
        setTimeout(() => {
          setShowGiveawayWinnerDialog(false);
          setActiveGiveaway(null);
        }, 10000);
      } else {
        // No winner
        setActiveGiveaway(null);
      }
      
      // Refetch giveaways list to update the UI
      refetchGiveaways();
    });

    return () => {
      // Clean up event listeners
      socket.off('user-connected');
      socket.off('left-room');
      socket.off('room-started');
      socket.off('room-ended');
      socket.off('product-pinned');
      socket.off('updated-pinned-product');
      socket.off('auction-started');
      socket.off('auction-pinned');
      socket.off('bid-updated');
      socket.off('auction-time-extended');
      socket.off('auction-ended');
      socket.off('started-giveaway');
      socket.off('joined-giveaway');
      socket.off('ended-giveaway');
      socket.off('createMessage');
      
      // CRITICAL: Leave room on unmount to clean up viewer tracking
      leaveRoom(id);
    };
  }, [socket, id, isConnected, proceedWithJoin]);

  // Subscribe to Firebase room messages
  useEffect(() => {
    if (!id) return;
    
    console.log(`Subscribing to Firebase room messages for show: ${id}`);
    
    const unsubscribe = subscribeToRoomMessages(
      id,
      (messages) => {
        console.log(`Received ${messages.length} messages from Firebase:`, messages);
        const formattedMessages = messages.map(msg => ({
          message: msg.message,
          senderName: msg.senderName,
          senderId: msg.sender,
          timestamp: msg.date,
          image_url: msg.senderProfileUrl,
          mentions: msg.mentions || []
        }));
        console.log('Formatted messages:', formattedMessages);
        setChatMessages(formattedMessages);
      },
      (error) => {
        console.error('Error loading room messages:', error);
      }
    );
    
    return () => {
      console.log(`Unsubscribing from Firebase room messages for show: ${id}`);
      unsubscribe();
    };
  }, [id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      });
    }
  }, [chatMessages]);

  // Search users for mentions
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setUserSuggestions([]);
      return;
    }
    
    setIsSearchingUsers(true);
    try {
      const response = await fetch(`/users?title=${encodeURIComponent(query)}&page=1&limit=10`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserSuggestions(data.users || data.data || []);
      } else {
        setUserSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSuggestions([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };
  
  // Handle message input change with @ detection
  const handleMessageChange = (text: string) => {
    setMessage(text);
    
    // Check if last word starts with @
    const words = text.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      // Search for users
      const searchQuery = lastWord.substring(1);
      searchUsers(searchQuery);
      setShowMentionDialog(true);
    } else {
      // Clear suggestions
      setUserSuggestions([]);
      setShowMentionDialog(false);
    }
  };
  
  // Handle mention selection
  const selectMention = (userName: string, userId: string) => {
    const words = message.split(' ');
    const lastWord = words[words.length - 1];
    
    // Replace the @word with @username followed by space
    const newText = lastWord.startsWith('@')
      ? message.substring(0, message.length - lastWord.length) + `@${userName} `
      : `${message} @${userName} `;
    
    setMessage(newText);
    
    // Add to current mentions
    setCurrentMentions(prev => [...prev, { id: userId, name: userName }]);
    
    // Clear suggestions and close dialog
    setUserSuggestions([]);
    setShowMentionDialog(false);
    
    // Focus back on input and move cursor to end
    if (messageInputRef.current) {
      messageInputRef.current.focus();
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.setSelectionRange(newText.length, newText.length);
        }
      }, 0);
    }
  };
  
  // Render message with clickable mentions
  const renderMessageWithMentions = (messageText: string, mentions: Array<{ id: string; name: string }> = []) => {
    // Check if message is a question (contains '?')
    const isQuestion = messageText.includes('?');
    const baseTextColor = isQuestion ? 'text-yellow-400' : 'text-zinc-300';
    
    if (!mentions || mentions.length === 0) {
      return <span className={`text-xs ${baseTextColor}`}>{messageText}</span>;
    }

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    // Sort mentions by their position in the text to process them in order
    const sortedMentions = [...mentions].sort((a, b) => {
      const handleA = `@${a.name}`;
      const handleB = `@${b.name}`;
      const indexA = messageText.indexOf(handleA, lastIndex);
      const indexB = messageText.indexOf(handleB, lastIndex);
      return indexA - indexB;
    });

    sortedMentions.forEach((mention, idx) => {
      const handle = `@${mention.name}`;
      const mentionIndex = messageText.indexOf(handle, lastIndex);

      if (mentionIndex === -1) return;

      // Add text before mention
      if (mentionIndex > lastIndex) {
        parts.push(
          <span key={`text-${idx}`} className={`text-xs ${baseTextColor}`}>
            {messageText.substring(lastIndex, mentionIndex)}
          </span>
        );
      }

      // Add clickable mention
      parts.push(
        <span
          key={`mention-${idx}`}
          onClick={() => window.open(`/profile/${mention.id}`, '_blank')}
          className="text-xs text-primary font-bold cursor-pointer hover:underline"
        >
          {handle}
        </span>
      );

      lastIndex = mentionIndex + handle.length;
    });

    // Add remaining text after last mention
    if (lastIndex < messageText.length) {
      parts.push(
        <span key="text-end" className={`text-xs ${baseTextColor}`}>
          {messageText.substring(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  };

  // Helper function to send chat message
  const handleSendMessage = async (messageText: string) => {
    if (!id || !messageText.trim() || !currentUserId) return;
    
    const userName = (user as any)?.userName || user?.firstName || 'Guest';
    const userPhoto = (user as any)?.profilePhoto || '';
    const mentionsToSend = [...currentMentions];
    
    console.log('Sending message with mentions:', mentionsToSend);
    
    try {
      await sendRoomMessage(
        id,
        messageText.trim(),
        currentUserId,
        userName,
        userPhoto,
        mentionsToSend
      );
      
      console.log('Message sent successfully');
      
      // Send notifications to mentioned users
      if (mentionsToSend.length > 0) {
        console.log('Sending notifications to:', mentionsToSend.map(m => m.id));
        try {
          const notifResponse = await fetch('/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: `${userName} mentioned you`,
              ids: mentionsToSend.map(m => m.id),
              message: "-",
              screen: "RoomScreen",
              id: id,
              sender: currentUserId,
              senderName: userName,
              senderphoto: userPhoto
            })
          });
          console.log('Notification response status:', notifResponse.status);
        } catch (notifError) {
          console.error('Error sending mention notifications:', notifError);
          // Don't show error to user, notification failure shouldn't block message sending
        }
      } else {
        console.log('No mentions to send notifications for');
      }
      
      setMessage('');
      setCurrentMentions([]);
      setUserSuggestions([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Giveaway timer
  useEffect(() => {
    if (!activeGiveaway || activeGiveaway.ended) return;
    
    const interval = setInterval(() => {
      const startTime = activeGiveaway.startedTime || 0;
      const duration = activeGiveaway.duration || 60; // Default 60 seconds
      const endTime = startTime + (duration * 1000);
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setGiveawayTimeLeft(timeLeft);
    }, 100);
    
    return () => clearInterval(interval);
  }, [activeGiveaway]);

  // Helper function to check if user has payment and shipping info
  const hasPaymentAndShipping = () => {
    if (!user) return false;
    const userData = user as any;
    return !!(userData.address && userData.defaultpaymentmethod);
  };

  // Check for payment/shipping when joining show (once per session)
  useEffect(() => {
    const checkPaymentShipping = async () => {
      // Wait for show data to load before checking
      if (!show || !user || hasShownPaymentAlertRef.current) return;
      
      // Check if user is the show owner
      const hostId = show?.owner?._id || show?.owner?.id;
      const isOwner = isAuthenticated && currentUserId === hostId;
      if (isOwner) return;
      
      // Refresh user data to get latest address/payment info from API
      await refreshUserData();
      
      // Check if user has payment and shipping after refresh
      if (!hasPaymentAndShipping()) {
        setShowPaymentShippingAlert(true);
        hasShownPaymentAlertRef.current = true;
      }
    };
    
    checkPaymentShipping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, show]); // Check when user ID changes or show loads

  // Refresh products when switching tabs
  useEffect(() => {
    if (productTab === 'Auction') {
      refetchAuction();
    } else if (productTab === 'Buy Now') {
      refetchBuyNow();
    } else if (productTab === 'Sold') {
      refetchSold();
    } else if (productTab === 'Giveaways') {
      refetchGiveaways();
    }
  }, [productTab, refetchAuction, refetchBuyNow, refetchSold, refetchGiveaways]);

  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!socket || !activeAuction) throw new Error('Cannot place bid');
      
      // Check if user has payment and shipping info before bidding
      if (!hasPaymentAndShipping()) {
        setShowPaymentShippingAlert(true);
        throw new Error('Please add payment and shipping information before bidding');
      }
      
      socket.emit('place-bid', {
        user: currentUserId,
        amount: amount,
        increaseBidBy: activeAuction.increaseBidBy || 5,
        auction: activeAuction._id || activeAuction.id,
        prebid: false,
        autobid: false,
        autobidamount: amount,
        roomId: id
      });
    },
    onSuccess: () => {
      setBidAmount('');
    }
  });

  // Join giveaway mutation
  const joinGiveawayMutation = useMutation({
    mutationFn: async () => {
      if (!socket || !activeGiveaway) throw new Error('Cannot join giveaway');
      
      // Check if user has an address (matching Flutter validation)
      const addressResponse = await fetch(`/api/address/all/${currentUserId}`);
      if (addressResponse.ok) {
        const addresses = await addressResponse.json();
        if (!addresses || addresses.length === 0) {
          throw new Error('Please add a shipping address before entering giveaways');
        }
      }
      
      // Check if user is already a participant (matching Flutter validation)
      const participants = activeGiveaway.participants || [];
      const isAlreadyParticipant = participants.some((p: any) => 
        (typeof p === 'string' ? p : p.id || p._id) === currentUserId
      );
      if (isAlreadyParticipant) {
        throw new Error('You have already entered this giveaway');
      }
      
      // Emit join-giveaway with correct structure (matching Flutter)
      socket.emit('join-giveaway', {
        giveawayId: activeGiveaway._id || activeGiveaway.id,
        showId: id,
        userId: currentUserId
      });
    },
    onSuccess: () => {
      toast({
        title: "Joined Giveaway!",
        description: "Good luck!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Join Giveaway",
        description: error.message || "Failed to join giveaway",
        variant: "destructive"
      });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Check if this is a giveaway
      const isGiveaway = selectedProduct?.saletype === 'giveaway' || 
                         selectedProduct?.listing_type === 'giveaway' ||
                         giveaways.some((g: any) => g._id === productId);
      
      if (isGiveaway) {
        // Delete giveaway using DELETE /api/giveaways/:id
        const response = await fetch(`/api/giveaways/${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete giveaway');
        }
        return response.json();
      } else {
        // Delete regular product using PUT /api/products/:id/delete
        const response = await fetch(`/api/products/${productId}/delete`, {
          method: 'PUT',
          credentials: 'include',
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete product');
        }
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/giveaways'] });
      refetchAuction();
      refetchBuyNow();
      refetchGiveaways();
      toast({
        title: "Deleted Successfully",
        description: "Item has been removed successfully"
      });
      setShowDeleteConfirm(false);
      setProductActionSheet(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  // Follow user mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !hostId) {
        throw new Error('Missing user or host ID');
      }
      const response = await fetch(`/api/follow/${currentUserId}/${hostId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to follow user');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsFollowingHost(true);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Follow Failed",
        description: error.message || "Failed to follow user",
        variant: "destructive"
      });
    }
  });

  // Unfollow user mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !hostId) {
        throw new Error('Missing user or host ID');
      }
      const response = await fetch(`/api/unfollow/${currentUserId}/${hostId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unfollow user');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsFollowingHost(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unfollow Failed",
        description: error.message || "Failed to unfollow user",
        variant: "destructive"
      });
    }
  });

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to follow users",
        variant: "destructive"
      });
      return;
    }
    
    if (isFollowingHost) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  // Handler for "Follow host to enter giveaway" button (matches Flutter behavior)
  const handleFollowAndJoinGiveaway = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to enter giveaways",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // First, follow the host
      if (!currentUserId || !hostId) {
        throw new Error('Missing user or host ID');
      }
      
      const followResponse = await fetch(`/api/follow/${currentUserId}/${hostId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      
      if (!followResponse.ok) {
        const error = await followResponse.json();
        throw new Error(error.error || 'Failed to follow user');
      }
      
      // Update following state
      setIsFollowingHost(true);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
      
      // Then join the giveaway (matching Flutter behavior)
      joinGiveawayMutation.mutate();
      
    } catch (error: any) {
      toast({
        title: "Failed to Enter Giveaway",
        description: error.message || "Could not follow host",
        variant: "destructive"
      });
    }
  };

  const host = show?.owner;
  const isLive = show?.started === true;
  const viewerCount = viewers.length || show?.viewers?.length || 0;
  const hostName = host?.userName || host?.firstName?.trim() || 'Host';
  const hostAvatar = host?.profilePhoto && host.profilePhoto.trim() ? host.profilePhoto : '';
  const showTitle = show?.title || 'Show';
  const showThumbnail = (show?.thumbnail && show.thumbnail.trim()) ? show.thumbnail.trim() : null;
  const averageReviews = host?.averagereviews ?? 0;
  const hasValidThumbnail = showThumbnail !== null && !imageError;
  const hasExplicitContent = show?.explicitContent === true || show?.explicit_content === true;
  const shippingOptions = show?.shippingOptions || show?.shipping_options;
  const hasFreePickup = shippingOptions?.freePickupEnabled === true || shippingOptions?.free_pickup_enabled === true;
  const hasBuyerCap = shippingOptions?.shippingCostMode === "buyer_pays_up_to" || shippingOptions?.shipping_cost_mode === "buyer_pays_up_to";
  
  // Format scheduled time
  const scheduledAt = show?.date || show?.scheduledAt || show?.scheduled_at;
  const formatScheduledTime = (timestamp: string | number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    
    // If scheduled time is in the past, show "Starting soon"
    if (date < now) {
      return 'Starting soon';
    }
    
    if (isToday(date)) {
      return `Today ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };
  const scheduledTimeText = scheduledAt ? formatScheduledTime(scheduledAt) : null;
  
  const currentBid = activeAuction?.currentBid || activeAuction?.higestbid || activeAuction?.newbaseprice || activeAuction?.bids?.[activeAuction.bids.length - 1]?.amount || activeAuction?.product?.startingPrice || activeAuction?.startingPrice || 0;
  const isUserWinning = activeAuction?.bids?.some((b: any) => 
    (b.bidder?.id === currentUserId || b.bidder?._id === currentUserId) && 
    b.amount === currentBid
  );

  // Extract products from API responses - display exactly what comes from the API
  const auctionProducts = auctionProductsData?.products || [];
  const buyNowProducts = buyNowProductsData?.products || [];
  
  const soldOrders = soldOrdersData?.orders || [];
  const giveaways = giveawaysData?.giveaways || [];

  // Check if current user is the show owner
  const hostId = host?._id || host?.id;
  const isShowOwner = isAuthenticated && currentUserId === hostId;
  
  // Initialize LiveKit for video streaming
  // Role is determined server-side based on room ownership
  const livekit = useLiveKit({
    roomId: id || '',
    userId: currentUserId || '',
    userName: user?.userName || user?.firstName || currentUserId || '',
    enabled: livekitEnabled && isLive,
  });
  
  // Initialize follow state from host's followers list
  useEffect(() => {
    if (host?.followers && currentUserId) {
      const isCurrentlyFollowing = host.followers.includes(currentUserId);
      setIsFollowingHost(isCurrentlyFollowing);
    }
  }, [host?.followers, currentUserId]);

  // Auto-enable LiveKit for viewers when show is live
  useEffect(() => {
    // Don't enable if show has ended
    if (show?.ended) {
      console.log('❌ Show has ended, not enabling LiveKit for viewer');
      setLivekitEnabled(false);
      return;
    }
    
    // Don't enable if show hasn't started
    if (show && !show.started) {
      console.log('❌ Show has not started, not enabling LiveKit for viewer');
      setLivekitEnabled(false);
      return;
    }
    
    if (isLive && !isShowOwner && !livekitEnabled) {
      console.log('🔴 Show is live, enabling LiveKit for viewer...');
      setLivekitEnabled(true);
    }
  }, [isLive, isShowOwner, livekitEnabled, show?.ended, show?.started]);

  // Handler to open product action sheet
  const handleProductAction = (product: any) => {
    console.log('🛒 Opening product action sheet:', {
      product,
      showStatus: show?.status,
      showStarted: show?.started,
      isLive,
      productSaletype: product?.saletype,
      productListingType: product?.listing_type
    });
    setSelectedProduct(product);
    setProductActionSheet(true);
  };

  // Handler to open add product dialog
  const handleAddProduct = (type: 'auction' | 'buy_now' | 'giveaway') => {
    setAddProductType(type);
    setShowAddProductDialog(true);
  };

  // Handler to open auction settings dialog
  const handleOpenAuctionSettings = () => {
    if (!selectedProduct) return;
    
    // Pre-fill settings with product data
    setAuctionSettings({
      startingPrice: selectedProduct.startingPrice || selectedProduct.price || 0,
      duration: selectedProduct.duration || 10,
      sudden: selectedProduct.sudden || false,
      counterBidTime: 5
    });
    
    setProductActionSheet(false);
    setShowAuctionSettingsDialog(true);
  };

  // Handler to rerun an ended auction
  const handleRerunAuction = () => {
    if (!activeAuction?.product) return;
    
    // Set the product from the ended auction
    setSelectedProduct(activeAuction.product);
    
    // Pre-fill settings with the previous auction data
    setAuctionSettings({
      startingPrice: activeAuction.baseprice || activeAuction.startingPrice || activeAuction.product.startingPrice || 0,
      duration: activeAuction.duration || 10,
      sudden: activeAuction.sudden || false,
      counterBidTime: activeAuction.increaseBidBy || 5
    });
    
    setShowAuctionSettingsDialog(true);
  };

  // Handler to pin/unpin product
  const handlePinProduct = () => {
    if (!socket || !selectedProduct || !id) return;
    
    const isPinned = pinnedProduct?._id === selectedProduct._id;
    
    // Emit pin-product event matching Flutter app structure
    socket.emit('pin-product', {
      pinned: !isPinned, // true to pin, false to unpin
      product: selectedProduct._id,
      tokshow: id
    });
    
    console.log('📌 Pin product emitted:', {
      pinned: !isPinned,
      product: selectedProduct._id,
      tokshow: id
    });
    
    setProductActionSheet(false);
  };
  
  // Handler to start auction with settings
  const handleStartAuctionWithSettings = () => {
    if (!socket || !selectedProduct) return;
    
    // Use the existing auction ID from the product
    const auctionId = selectedProduct.auction?._id || selectedProduct.auction;
    
    console.log('🎯 Product auction info:', {
      productId: selectedProduct._id,
      auctionField: selectedProduct.auction,
      auctionId
    });
    
    // Build auction object matching Flutter app structure
    const auctionData = {
      _id: auctionId, // Use the auction ID from the product
      winner: null,
      higestbid: 0,
      winning: false,
      bids: [],
      tokshow: id,
      sudden: auctionSettings.sudden,
      owner: currentUserId,
      increaseBidBy: auctionSettings.counterBidTime,
      baseprice: auctionSettings.startingPrice,
      product: selectedProduct._id || selectedProduct.id,
      duration: auctionSettings.duration,
      startedTime: null,
      started: false,
      ended: false
    };
    
    console.log('🎯 Starting auction:', {
      roomId: id,
      auction: auctionData,
      increaseBidBy: auctionSettings.counterBidTime
    });
    
    console.log('📡 Socket status before emit:', {
      connected: socket.connected,
      id: socket.id,
      hasListeners: socket.hasListeners('auction-started')
    });
    
    socket.emit('start-auction', {
      roomId: id,
      auction: auctionData,
      increaseBidBy: auctionSettings.counterBidTime
    });
    
    console.log('✅ start-auction event emitted to external API');
    
    setShowAuctionSettingsDialog(false);
    setSelectedProduct(null);
    toast({
      title: "Auction Started!",
      description: selectedProduct.name
    });
  };

  // Handler to start giveaway
  const handleStartGiveaway = () => {
    if (!socket || !selectedProduct || !id) return;
    
    console.log('🎁 Starting giveaway:', {
      giveawayId: selectedProduct._id,
      showId: id
    });
    
    // Emit start-giveaway event matching Flutter app structure
    socket.emit('start-giveaway', {
      giveawayId: selectedProduct._id,
      showId: id
    });
    
    setProductActionSheet(false);
    setSelectedProduct(null);
    toast({
      title: "Giveaway Started!",
      description: selectedProduct.name || "Giveaway is now live"
    });
  };

  // Handler to manually end giveaway (draw winner)
  const handleEndGiveaway = () => {
    if (!socket || !activeGiveaway || !id) return;
    
    console.log('🎁 Ending giveaway:', {
      giveawayId: activeGiveaway._id,
      showId: id
    });
    
    // Emit draw-giveaway event matching Flutter app structure
    socket.emit('draw-giveaway', {
      giveawayId: activeGiveaway._id,
      showId: id
    });
    
    toast({
      title: "Drawing Winner...",
      description: "Ending giveaway and selecting winner"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading show...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Show Not Found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black text-white flex flex-col overflow-hidden">
      {/* Show Ended Alert */}
      {show?.ended && (
        <Alert className="rounded-none border-x-0 border-t-0 border-b border-zinc-800 bg-red-900/20 border-red-800/30 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-sm text-red-200">
            This show has already ended
          </AlertDescription>
        </Alert>
      )}

      {/* Shipping/Explicit Content Warnings */}
      {(hasFreePickup || hasBuyerCap || hasExplicitContent) && (
        <Alert className="rounded-none border-x-0 border-t-0 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-4 text-xs">
            {hasFreePickup && (
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Free Local Pickup Available
              </span>
            )}
            {hasBuyerCap && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Shipping capped at ${shippingOptions.reducedShippingCapAmount || shippingOptions.reduced_shipping_cap_amount}
              </span>
            )}
            {hasExplicitContent && (
              <span className="flex items-center gap-1 text-orange-400">
                <AlertTriangle className="h-3 w-3" />
                May contain explicit content
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Sidebar - Products */}
        <div className={`
          ${showMobileProducts ? 'fixed inset-0 z-50 bg-black' : 'hidden'}
          lg:flex lg:flex-col lg:relative lg:w-96 lg:z-auto
          bg-black border-r border-zinc-800 flex flex-col
        `} style={{ height: '90vh' }}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-white font-semibold">Products</h2>
            <button onClick={() => setShowMobileProducts(false)} data-testid="button-close-products">
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Show Title - Desktop Only */}
          <div className="hidden lg:block px-4 py-3 border-b border-zinc-800">
            <h2 className="text-white font-semibold text-base" data-testid="text-show-title-left">
              {showTitle}
            </h2>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 text-xs">
            <button 
              className={`flex-1 px-2 py-2.5 ${productTab === 'Auction' ? 'border-b-2 border-primary text-white' : 'text-zinc-400'}`}
              onClick={() => setProductTab('Auction')}
              data-testid="tab-auction"
            >
              Auction
            </button>
            <button 
              className={`flex-1 px-2 py-2.5 ${productTab === 'Buy Now' ? 'border-b-2 border-primary text-white' : 'text-zinc-400'}`}
              onClick={() => setProductTab('Buy Now')}
              data-testid="tab-buy-now"
            >
              Buy Now
            </button>
            <button 
              className={`flex-1 px-2 py-2.5 ${productTab === 'Giveaways' ? 'border-b-2 border-primary text-white' : 'text-zinc-400'}`}
              onClick={() => setProductTab('Giveaways')}
              data-testid="tab-giveaways"
            >
              Giveaways
            </button>
            <button 
              className={`flex-1 px-2 py-2.5 ${productTab === 'Sold' ? 'border-b-2 border-primary text-white' : 'text-zinc-400'}`}
              onClick={() => setProductTab('Sold')}
              data-testid="tab-sold"
            >
              Sold
            </button>
          </div>

          {/* Tab Content - Fixed Height */}
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {productTab === 'Auction' && (
              <>
                <div className="h-full overflow-y-auto pb-20">
                {auctionProducts
                  .filter((product: any) => product._id !== pinnedProduct?._id)
                  .map((product: any, index: number) => {
                  const isActiveAuction = activeAuction?.product?._id === product._id;
                  return (
                    <div key={product._id || product.id || index} className="px-4 py-4 border-b border-zinc-700 relative" data-testid={`product-auction-${product._id || index}`}>
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2 leading-tight">{product.name}</h3>
                          <p className="text-sm text-zinc-400 mb-1">{product.auction?.bids?.length || 0} bids</p>
                          <p className="text-sm text-zinc-400">1 Available</p>
                        </div>
                        <div className="w-20 h-20 flex-shrink-0 relative">
                          <div className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          {isShowOwner && !isActiveAuction && (
                            <Button 
                              size="icon"
                              className="absolute top-1 right-1 h-7 w-7 bg-black/70 hover:bg-black/90 text-white rounded-full" 
                              onClick={() => handleProductAction(product)}
                              data-testid={`button-product-action-${product._id || index}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!activeAuction && auctionProducts.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No auction items
                  </div>
                )}
                </div>
                {isShowOwner && (
                  <Button
                    size="icon"
                    className="absolute bottom-4 right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50"
                    onClick={() => handleAddProduct('auction')}
                    data-testid="button-add-auction"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                )}
              </>
            )}
            
            {productTab === 'Buy Now' && (
              <>
                <div className="h-full overflow-y-auto pb-20">
                {pinnedProduct && (
                  <div className="px-4 py-4 border-b border-zinc-700 bg-zinc-900/50 relative" data-testid="product-pinned">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <Badge className="mb-2 bg-primary text-primary-foreground text-xs">Pinned</Badge>
                        <h3 className="text-lg font-bold text-white mb-2 leading-tight">{pinnedProduct.name}</h3>
                        <p className="text-sm text-zinc-400 mb-1">{pinnedProduct.quantity || 0} Available</p>
                        <p className="text-sm text-zinc-400 mb-2">Price: ${(pinnedProduct.price || 0).toFixed(2)}</p>
                        {!isShowOwner && (
                          <Button
                            size="sm"
                            className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            onClick={() => {
                              setBuyNowProduct(pinnedProduct);
                              setShowBuyNowDialog(true);
                            }}
                            data-testid="button-buy-now-pinned"
                          >
                            Buy Now
                          </Button>
                        )}
                      </div>
                      <div className="w-20 h-20 flex-shrink-0 relative">
                        <div className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
                          {pinnedProduct.images?.[0] && (
                            <img src={pinnedProduct.images[0]} alt={pinnedProduct.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        {isShowOwner && (
                          <Button 
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 bg-black/70 hover:bg-black/90 text-white rounded-full" 
                            onClick={() => handleProductAction(pinnedProduct)}
                            data-testid="button-product-action-pinned"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {buyNowProducts
                  .filter((product: any) => product._id !== pinnedProduct?._id)
                  .map((product: any, index: number) => (
                  <div key={product._id || product.id || index} className="px-4 py-4 border-b border-zinc-700 relative" data-testid={`product-buynow-${product._id || index}`}>
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 leading-tight">{product.name}</h3>
                        <p className="text-sm text-zinc-400 mb-1">{product.quantity || 1} Available</p>
                        <p className="text-base font-semibold text-white mb-2">Price: ${(product.price || 0).toFixed(2)}</p>
                        {!isShowOwner && (
                          <Button
                            size="sm"
                            className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            onClick={() => {
                              setBuyNowProduct(product);
                              setShowBuyNowDialog(true);
                            }}
                            data-testid={`button-buy-now-${product._id || index}`}
                          >
                            Buy Now
                          </Button>
                        )}
                      </div>
                      <div className="w-20 h-20 flex-shrink-0 relative">
                        <div className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        {isShowOwner && (
                          <Button 
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 bg-black/70 hover:bg-black/90 text-white rounded-full" 
                            onClick={() => handleProductAction(product)}
                            data-testid={`button-product-action-${product._id || index}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!pinnedProduct && buyNowProducts.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No buy now items
                  </div>
                )}
                </div>
                {isShowOwner && (
                  <Button
                    size="icon"
                    className="absolute bottom-4 right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50"
                    onClick={() => handleAddProduct('buy_now')}
                    data-testid="button-add-buy-now"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                )}
              </>
            )}
            
            {productTab === 'Giveaways' && (
              <>
                <div className="h-full overflow-y-auto pb-20">
                {activeGiveaway && (
                  <div className="px-4 py-4 border-b border-zinc-700 bg-zinc-900/50" data-testid="giveaway-active">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <Badge className="mb-2 bg-primary text-primary-foreground text-xs">Active Giveaway</Badge>
                        <h3 className="text-lg font-bold text-white mb-2 leading-tight">{activeGiveaway.name || 'Giveaway'}</h3>
                        <p className="text-sm text-zinc-400 mb-1">{activeGiveaway.participants?.length || 0} participants</p>
                        {!activeGiveaway.ended && giveawayTimeLeft > 0 && (
                          <p className="text-sm text-zinc-400">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {Math.floor(giveawayTimeLeft / 60)}:{(giveawayTimeLeft % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                      <div className="w-20 h-20 flex-shrink-0">
                        <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                          <Gift className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {giveaways.filter((g: any) => g._id !== activeGiveaway?._id).map((giveaway: any, index: number) => (
                  <div key={giveaway._id || giveaway.id || index} className="px-4 py-4 border-b border-zinc-700 relative" data-testid={`giveaway-${giveaway._id || index}`}>
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 leading-tight">{giveaway.name || 'Giveaway'}</h3>
                        <p className="text-sm text-zinc-400 mb-1">{giveaway.participants?.length || 0} participants</p>
                        {giveaway.winner && (
                          <p className="text-sm text-green-400">Winner: {giveaway.winner.userName || 'Someone'}</p>
                        )}
                      </div>
                      <div className="w-20 h-20 flex-shrink-0 relative">
                        <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                          <Gift className="h-10 w-10 text-zinc-600" />
                        </div>
                        {isShowOwner && (
                          <Button 
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 bg-black/70 hover:bg-black/90 text-white rounded-full" 
                            onClick={() => handleProductAction(giveaway)}
                            data-testid={`button-product-action-${giveaway._id || index}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!activeGiveaway && giveaways.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No giveaways
                  </div>
                )}
                </div>
                {isShowOwner && (
                  <Button
                    size="icon"
                    className="absolute bottom-4 right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50"
                    onClick={() => handleAddProduct('giveaway')}
                    data-testid="button-add-giveaway"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                )}
              </>
            )}
            
            {productTab === 'Sold' && (
              <div className="h-full overflow-y-auto pb-20">
                {soldOrders.map((order: any, index: number) => {
                  const isGiveaway = !!order.giveaway;
                  
                  // For giveaway orders, use order.giveaway
                  // For regular orders, use order.items array
                  let product, productName, productImage, orderPrice, quantity;
                  
                  if (isGiveaway) {
                    product = order.giveaway;
                    productName = product?.name || product?.title || 'Giveaway Item';
                    productImage = product?.images?.[0] || product?.image;
                    orderPrice = 0; // Giveaways are free
                    quantity = order.quantity || product?.quantity || 1;
                  } else {
                    // Regular order with items array
                    const firstItem = order.items?.[0];
                    product = firstItem?.productId || firstItem;
                    productName = product?.name || product?.title || 'Item';
                    productImage = product?.images?.[0] || product?.image;
                    orderPrice = order.total || order.price || (firstItem?.price * (firstItem?.quantity || 1)) || 0;
                    quantity = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1;
                  }
                  
                  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || order.customer?.userName || order.customer?.email || 'Customer';
                  
                  return (
                    <div key={order._id || order.id || index} className="px-4 py-4 border-b border-zinc-700" data-testid={`order-sold-${order._id || index}`}>
                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-16 flex-shrink-0">
                          <div className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
                            {productImage ? (
                              <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-zinc-600" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-0.5 leading-tight truncate">{productName}</h3>
                          <p className="text-xs text-zinc-400 mb-1 truncate">{customerName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isGiveaway ? (
                              <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5">
                                Giveaway
                              </Badge>
                            ) : (
                              <p className="text-sm font-bold text-white">${(orderPrice || 0).toFixed(2)}</p>
                            )}
                            <span className="text-xs text-zinc-500">•</span>
                            <p className="text-xs text-zinc-400">Qty: {quantity}</p>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-zinc-800 h-8 px-3"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailDialog(true);
                          }}
                          data-testid={`button-view-order-${order._id || index}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {soldOrders.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No sold items yet
                  </div>
                )}
                </div>
            )}
          </div>
        </div>

        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col bg-black min-w-0 h-auto" style={{ height: window.innerWidth < 1024 ? 'var(--mobile-vh, 100vh)' : 'auto' }}>
          {/* Video Player Container - Full height */}
          <div className="relative bg-black flex items-center justify-center overflow-hidden h-full">
            {/* Host Info Bar - Overlaid on video */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <div className="flex items-center gap-3">
                <a 
                  href={`/profile/${hostId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  data-testid="link-host-profile"
                >
                  <Avatar className="h-12 w-12" data-testid="avatar-host">
                    <AvatarImage src={hostAvatar} />
                    <AvatarFallback className="text-sm">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </a>
                <div className="flex flex-col gap-0.5">
                  <a 
                    href={`/profile/${hostId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-white leading-tight hover:underline"
                    data-testid="link-host-username"
                  >
                    {hostName}
                  </a>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-white">
                      <Star className="h-3.5 w-3.5 fill-white" />
                      <span className="text-sm font-semibold">{averageReviews.toFixed(1)}</span>
                    </div>
                    {!isShowOwner && (
                      <Badge 
                        className={`${
                          isFollowingHost 
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-white' 
                            : 'bg-yellow-400 hover:bg-yellow-500 text-black'
                        } font-bold px-3 py-0.5 text-xs h-6 w-fit rounded-full cursor-pointer transition-colors`}
                        onClick={handleFollowToggle}
                        data-testid="badge-follow-status"
                      >
                        {followMutation.isPending || unfollowMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          isFollowingHost ? 'Following' : 'Follow'
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                  <div className="relative flex items-center justify-center">
                    <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center">
                      <Radio className="h-4 w-4" />
                    </div>
                    {isLive && (
                      <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-base font-bold">{viewerCount}</span>
                </div>
              </div>
            </div>

            <div className="relative w-full h-full md:w-auto md:h-full md:aspect-[9/16] lg:max-w-[400px] xl:max-w-[450px] 2xl:max-w-[500px]">
              
              {/* More Options Sheet Overlay - Positioned within video container */}
              {showMoreOptionsSheet && (
                <div 
                  className="absolute inset-0 z-50 flex items-end"
                  onClick={() => setShowMoreOptionsSheet(false)}
                >
                  {/* Backdrop */}
                  <div className="absolute inset-0 bg-black/50" />
                  
                  {/* Sheet content - bottom sheet style */}
                  <div 
                    className="relative w-full bg-white rounded-t-2xl shadow-xl animate-in slide-in-from-bottom-5 duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-black">Show Options</h3>
                        <p className="text-sm text-gray-600 mt-1">Manage your live show</p>
                      </div>
                      <div className="space-y-2">
                        {/* End Show - Only show when live */}
                        {isLive && (
                          <button
                            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              if (isEndingShow) return;
                              
                              setIsEndingShow(true);
                              setShowMoreOptionsSheet(false);
                              
                              try {
                                const endResponse = await fetch(`/api/rooms/${id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ ended: true })
                                });
                                
                                if (!endResponse.ok) {
                                  throw new Error('Failed to end show');
                                }
                                
                                console.log('✅ Show ended successfully');
                                
                                if (socket) {
                                  socket.emit('end-room', { roomId: id });
                                }
                                
                                if (livekit.disconnect) {
                                  await livekit.disconnect();
                                }
                                setLivekitEnabled(false);
                                
                                if (id) {
                                  leaveRoom(id);
                                }
                                
                                queryClient.invalidateQueries({ queryKey: ['/api/rooms', id, currentUserId] });
                                
                                toast({
                                  title: "Show Ended",
                                  description: "Your show has been ended successfully.",
                                });
                                
                                navigate('/');
                              } catch (error) {
                                console.error('Error ending show:', error);
                                setIsEndingShow(false);
                                toast({
                                  title: "Error",
                                  description: "Failed to end show. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={isEndingShow}
                            data-testid="button-end-show"
                          >
                            {isEndingShow ? (
                              <>
                                <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                                <span className="flex-1 text-left text-black font-semibold">Ending Show...</span>
                              </>
                            ) : (
                              <>
                                <X className="h-5 w-5 text-red-600" />
                                <span className="flex-1 text-left text-black font-semibold">End Show</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete Show - Only show when not started */}
                        {!isLive && (
                          <button
                            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              if (isEndingShow) return;
                              
                              setIsEndingShow(true);
                              setShowMoreOptionsSheet(false);
                              
                              try {
                                const deleteResponse = await fetch(`/api/rooms/${id}?destroy=true`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                });
                                
                                if (!deleteResponse.ok) {
                                  throw new Error('Failed to delete show');
                                }
                                
                                console.log('✅ Show deleted successfully');
                                
                                if (id) {
                                  leaveRoom(id);
                                }
                                
                                toast({
                                  title: "Show Deleted",
                                  description: "Your show has been deleted successfully.",
                                });
                                
                                navigate('/');
                              } catch (error) {
                                console.error('Error deleting show:', error);
                                setIsEndingShow(false);
                                toast({
                                  title: "Error",
                                  description: "Failed to delete show. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={isEndingShow}
                            data-testid="button-delete-show"
                          >
                            {isEndingShow ? (
                              <>
                                <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                                <span className="flex-1 text-left text-black font-semibold">Deleting...</span>
                              </>
                            ) : (
                              <>
                                <Trash className="h-5 w-5 text-red-600" />
                                <span className="flex-1 text-left text-black font-semibold">Delete</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Cancel */}
                        <button
                          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setShowMoreOptionsSheet(false)}
                          data-testid="button-cancel-options"
                        >
                          <span className="flex-1 text-center text-gray-600">Cancel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auction Winner Announcement - Small overlay at top of video */}
              {showWinnerDialog && winnerData && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-white rounded-full shadow-2xl px-4 py-2 flex items-center gap-3">
                    {winnerData?.profileImage ? (
                      <img 
                        src={winnerData.profileImage} 
                        alt={winnerData?.name || 'Winner'} 
                        className="w-10 h-10 rounded-full object-cover"
                        data-testid="img-winner-profile"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {winnerData?.name?.substring(0, 2).toUpperCase() || '🏆'}
                        </span>
                      </div>
                    )}
                    <span className="text-black font-bold text-sm whitespace-nowrap" data-testid="text-winner-name">
                      {winnerData?.name || 'Someone'} won the auction!
                    </span>
                  </div>
                </div>
              )}

              {/* Giveaway Winner Announcement - Appealing overlay at top of video */}
              {showGiveawayWinnerDialog && giveawayWinnerData && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 border-2 border-white/20">
                    <Gift className="h-6 w-6 text-white animate-bounce" />
                    {giveawayWinnerData?.profileImage ? (
                      <img 
                        src={giveawayWinnerData.profileImage} 
                        alt={giveawayWinnerData?.name || 'Winner'} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                        data-testid="img-giveaway-winner-profile"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white shadow-lg">
                        <span className="text-white text-base font-bold">
                          {giveawayWinnerData?.name?.substring(0, 2).toUpperCase() || '🎉'}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-base whitespace-nowrap" data-testid="text-giveaway-winner-name">
                        {giveawayWinnerData?.name || 'Someone'} won!
                      </span>
                      <span className="text-white/90 text-xs whitespace-nowrap">
                        {giveawayWinnerData?.giveawayName}
                      </span>
                    </div>
                    <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                  </div>
                </div>
              )}

              {/* LiveKit Video Player - shown when connected AND has video */}
              {livekit.isConnected && livekit.room && livekit.hasVideo && (
                <div className="absolute inset-0 w-full h-full z-20 bg-black" data-testid="livekit-video-player">
                  <LiveKitVideoPlayer room={livekit.room} />
                </div>
              )}

              {/* Show connecting state */}
              {livekit.isConnecting && (
                <div className="absolute inset-0 w-full h-full bg-black/90 z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 className="h-12 w-12 animate-spin" />
                    <p className="text-lg font-semibold">Connecting to live stream...</p>
                    <p className="text-sm text-white/70">This may take a few moments</p>
                  </div>
                </div>
              )}

              {/* Show camera initializing state - when connected but no video yet */}
              {livekit.isConnected && !livekit.hasVideo && !livekit.isConnecting && isShowOwner && (
                <div className="absolute inset-0 w-full h-full bg-black/90 z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-white">
                    <Video className="h-12 w-12 animate-pulse" />
                    <p className="text-lg font-semibold">Initializing camera...</p>
                    <p className="text-sm text-white/70">Please allow camera and microphone access</p>
                  </div>
                </div>
              )}

              {/* Show error state */}
              {livekit.error && !livekit.isConnected && (
                <div className="absolute inset-0 w-full h-full bg-black/80 z-15 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-white max-w-sm mx-4">
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                    <p className="text-lg font-semibold text-center">{livekit.error}</p>
                    <Button onClick={livekit.connect} variant="outline">
                      Retry Connection
                    </Button>
                  </div>
                </div>
              )}

              {/* Always show placeholder as background */}
              <div className="relative w-full h-full bg-gray-800" data-testid="show-video-placeholder">
                <span className="sr-only">No video available</span>
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-12 gap-0" aria-hidden="true">
                  {Array.from({ length: 96 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-center" style={{ opacity: 0.1 + (Math.random() * 0.3) }}>
                      <svg viewBox="0 0 200 200" className="w-full h-full text-gray-600">
                        <path fill="currentColor" d="M100 30 L170 100 L100 170 L30 100 Z"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Overlay image on top if it exists and loads successfully - hide when video is actually playing */}
              {showThumbnail && !imageError && !livekit.hasVideo && (
                <img
                  src={showThumbnail}
                  alt={showTitle}
                  className="absolute inset-0 w-full h-full object-cover z-10"
                  onError={() => setImageError(true)}
                  data-testid="show-video-thumbnail"
                />
              )}

              {/* Desktop Product Info Overlay - Left Side */}
              <div 
                className={cn(
                  "hidden lg:block absolute left-0 right-24 px-4 pointer-events-none z-30",
                  activeAuction && !activeAuction.ended && auctionTimeLeft > 0 && !isShowOwner ? "bottom-20" : "bottom-4"
                )}
              >
                <div className="pointer-events-auto max-w-md">
                  {/* Active Auction Info */}
                  {activeAuction && (
                    <div className="space-y-1.5">
                      {activeAuction.bids && activeAuction.bids.length > 0 && !activeAuction.ended && (
                        <p className="text-xs font-bold uppercase tracking-wide drop-shadow-lg">
                          <span className="text-white">{winningUser?.userName || winningUser?.firstName || 'Someone'}</span>{' '}
                          <span className="text-teal-400">winning!</span>
                        </p>
                      )}
                      
                      <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">
                        {activeAuction.product?.name || 'Auction Item'}
                      </h2>
                      
                      <div className="flex items-center gap-1.5 text-white/90">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10" opacity="0.3"/>
                          <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">$</text>
                        </svg>
                        <span className="text-sm font-medium drop-shadow-lg">
                          Bids: {activeAuction.bids?.length || 0}
                        </span>
                      </div>
                      
                      {shippingEstimate && (
                        <p className="text-white/90 text-sm underline drop-shadow-lg">
                          Shipping is US${parseFloat(shippingEstimate.amount || 0).toFixed(2)} + Taxes
                        </p>
                      )}
                      
                      {/* Rerun Auction Button - Show when auction ended with no bids and user is owner */}
                      {activeAuction.ended && isShowOwner && (!activeAuction.bids || activeAuction.bids.length === 0) && (
                        <Button
                          onClick={handleRerunAuction}
                          className="mt-6 w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base transition-colors"
                          data-testid="button-rerun-auction"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Rerun Auction
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Pinned Product Info */}
                  {(!activeAuction || activeAuction.ended) && pinnedProduct && (
                    <div className="space-y-1.5">
                      <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">
                        {pinnedProduct.name || 'Product'}
                      </h2>
                      
                      <div className="flex items-center gap-1.5 text-white/90">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10" opacity="0.3"/>
                          <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">$</text>
                        </svg>
                        <span className="text-sm font-medium drop-shadow-lg">
                          Available: {pinnedProduct.quantity || 0}
                        </span>
                      </div>
                      
                      {shippingEstimate && (
                        <p className="text-white/90 text-sm underline drop-shadow-lg">
                          Shipping is US${parseFloat(shippingEstimate.amount || 0).toFixed(2)} + Taxes
                        </p>
                      )}
                      
                      <Button
                        onClick={() => {
                          window.location.href = `/checkout/${pinnedProduct._id}`;
                        }}
                        className="mt-6 w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base transition-colors"
                        data-testid="button-buy-now-overlay"
                      >
                        <ShoppingBag className="h-5 w-5 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Combined Chat, Product Info & Auction Section - Mobile Only */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 pointer-events-none lg:hidden z-50 flex flex-col",
                (showMobileProducts || showMobileChat) && "hidden"
              )}>
                {/* Chat Messages & Input - Top section */}
                <div className="bg-gradient-to-t from-transparent via-black/20 to-transparent pb-2">
                  <div className="pl-3 pr-3 pb-2 md:pl-4 md:pr-auto md:max-w-80 flex flex-col gap-2">
                    {/* Chat Messages - strictly limited height */}
                    <div ref={chatMessagesRef} className={cn(
                      "space-y-0.5 overflow-y-auto scrollbar-hide flex flex-col",
                      !activeAuction && !pinnedProduct ? "min-h-[40vh] justify-end" : "max-h-[30vh] justify-start"
                    )}>
                        {chatMessages.slice(-6).map((msg, i) => (
                          <div 
                            key={i} 
                            className="flex gap-2 p-1 animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto"
                            data-testid={`chat-overlay-message-${i}`}
                          >
                            <Avatar 
                              className="h-6 w-6 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                if (msg.senderId) {
                                  window.open(`/profile/${msg.senderId}`, '_blank');
                                }
                              }}
                            >
                              <AvatarImage src={msg.image_url} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {msg.senderName?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-xs font-bold text-white leading-tight cursor-pointer hover:underline drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                                onClick={() => {
                                  if (msg.senderId) {
                                    window.open(`/profile/${msg.senderId}`, '_blank');
                                  }
                                }}
                              >
                                {msg.senderName}
                              </p>
                              <div className="text-xs leading-tight break-words text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                {renderMessageWithMentions(msg.message, msg.mentions)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chat Input */}
                      {isAuthenticated && (
                        <div className="pointer-events-auto">
                          {/* User Suggestions Chips */}
                          {userSuggestions.length > 0 && (
                            <div className="mb-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                              {userSuggestions.map((suggestedUser) => (
                                <div
                                  key={suggestedUser._id || suggestedUser.id}
                                  onClick={() => selectMention(
                                    suggestedUser.userName || suggestedUser.firstName,
                                    suggestedUser._id || suggestedUser.id
                                  )}
                                  className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                  data-testid={`mention-suggestion-mobile-${suggestedUser._id || suggestedUser.id}`}
                                >
                                  <Avatar className="h-7 w-7">
                                    {suggestedUser.profilePhoto && (
                                      <AvatarImage src={suggestedUser.profilePhoto} alt={suggestedUser.userName} />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {(suggestedUser.userName || suggestedUser.firstName || 'A').charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-white max-w-[60px] truncate">
                                    {suggestedUser.userName || suggestedUser.firstName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Send a message..."
                              value={message}
                              onChange={(e) => handleMessageChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && message.trim()) {
                                  e.preventDefault();
                                  handleSendMessage(message);
                                }
                              }}
                              className="flex-1 bg-zinc-900/90 border-zinc-700 text-white placeholder:text-zinc-400 h-11 rounded-full px-5"
                              data-testid="input-chat-message"
                            />
                            {message.trim() && (
                              <Button
                                onClick={() => handleSendMessage(message)}
                                size="icon"
                                className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                                data-testid="button-send-message"
                              >
                                <Send className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                
                {/* Product Info & Auction Buttons - Bottom section */}
                <div className="px-4 pb-3 pt-3 pointer-events-auto">
                  {/* Product Info */}
                  <div className="mb-3">
                    {/* Active Auction Info */}
                    {activeAuction && (
                      <div className="space-y-1.5">
                        {/* Current Winning Bidder */}
                        {activeAuction.bids && activeAuction.bids.length > 0 && !activeAuction.ended && (
                          <p className="text-xs font-bold uppercase tracking-wide drop-shadow-lg">
                            <span className="text-white">{winningUser?.userName || winningUser?.firstName || 'Someone'}</span>{' '}
                            <span className="text-teal-400">winning!</span>
                          </p>
                        )}
                        
                        {/* Product Name */}
                        <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">
                          {activeAuction.product?.name || 'Auction Item'}
                        </h2>
                        
                        {/* Bids Count */}
                        <div className="flex items-center gap-1.5 text-white/90">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                            <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">$</text>
                          </svg>
                          <span className="text-sm font-medium drop-shadow-lg">
                            Bids: {activeAuction.bids?.length || 0}
                          </span>
                        </div>
                        
                        {/* Shipping Info */}
                        {shippingEstimate && (
                          <p className="text-white/90 text-sm underline drop-shadow-lg">
                            Shipping is US${parseFloat(shippingEstimate.amount || 0).toFixed(2)} + Taxes
                          </p>
                        )}
                        
                        {/* Rerun Auction Button - Show when auction ended with no bids and user is owner */}
                        {activeAuction.ended && isShowOwner && (!activeAuction.bids || activeAuction.bids.length === 0) && (
                          <Button
                            onClick={handleRerunAuction}
                            className="mt-6 w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base transition-colors"
                            data-testid="button-rerun-auction"
                          >
                            <Play className="h-5 w-5 mr-2" />
                            Rerun Auction
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Pinned Product Info */}
                    {(!activeAuction || activeAuction.ended) && pinnedProduct && (
                      <div className="space-y-1.5">
                        {/* Product Name */}
                        <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">
                          {pinnedProduct.name || 'Product'}
                        </h2>
                        
                        {/* Available Count */}
                        <div className="flex items-center gap-1.5 text-white/90">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                            <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">$</text>
                          </svg>
                          <span className="text-sm font-medium drop-shadow-lg">
                            Available: {pinnedProduct.quantity || 0}
                          </span>
                        </div>
                        
                        {/* Shipping Info */}
                        {shippingEstimate && (
                          <p className="text-white/90 text-sm underline drop-shadow-lg">
                            Shipping is US${parseFloat(shippingEstimate.amount || 0).toFixed(2)} + Taxes
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Auction Buttons */}
                  {activeAuction && !activeAuction.ended && auctionTimeLeft > 0 && !isShowOwner && (
                    <div className="flex gap-2 border-t border-white/10 pt-3">
                      <button
                        className="h-11 px-7 rounded-full border-2 border-white/90 text-white font-semibold text-lg bg-transparent hover:bg-white/10 transition-colors"
                        data-testid="button-custom-bid"
                      >
                        Custom
                      </button>
                      <button
                        onClick={() => {
                          const amount = currentBid + 1;
                          placeBidMutation.mutate(amount);
                        }}
                        disabled={placeBidMutation.isPending}
                        className="flex-1 h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg transition-colors disabled:opacity-50"
                        data-testid="button-place-bid"
                      >
                        {placeBidMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                          `Bid: $${(currentBid + 1).toFixed(0)}`
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduled Show Info - Center (Only shown when show is not live and user is NOT owner) */}
              {!isLive && !isShowOwner && (
                <div className="absolute top-0 left-0 right-0 translate-y-0 lg:top-1/2 lg:-translate-y-1/2 flex justify-center z-30 pointer-events-none">
                  <div className="flex flex-col items-center gap-3 px-6 py-8 pointer-events-auto bg-black/40 backdrop-blur-sm rounded-3xl">
                    {/* Show starts text and time */}
                    <div className="text-center mb-2">
                      <p className="text-white text-sm font-medium mb-1">Show starts</p>
                      <p className="text-white text-2xl font-bold">{scheduledTimeText || 'Soon'}</p>
                    </div>
                    
                    {/* Buttons for viewers */}
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                      <Button
                        size="lg"
                        className="w-full h-12 text-base font-bold bg-yellow-400 hover:bg-yellow-500 text-black rounded-full shadow-lg"
                        onClick={async () => {
                          try {
                            const currentInvitedIds = show?.invitedhostIds || show?.invited_host_ids || [];
                            const isAlreadySaved = currentInvitedIds.includes(currentUserId);
                            const invitedhostIds = isAlreadySaved
                              ? currentInvitedIds.filter((userId: string) => userId !== currentUserId) // Remove user ID
                              : [...currentInvitedIds, currentUserId]; // Add user ID
                            
                            const response = await fetch(`/api/rooms/${id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({ invitedhostIds })
                            });
                            
                            if (response.ok) {
                              setIsNotificationSaved(!isAlreadySaved);
                              toast({
                                title: isAlreadySaved ? "Notification Removed" : "Notification Set",
                                description: isAlreadySaved 
                                  ? "You won't be notified about this show"
                                  : "We'll notify you when the show starts!"
                              });
                              queryClient.invalidateQueries({ queryKey: ['/api/rooms', id] });
                            } else {
                              throw new Error('Failed to update notification');
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update notification. Please try again.",
                              variant: "destructive"
                            });
                          }
                        }}
                        data-testid="button-save-notify"
                      >
                        <Bookmark className={cn("h-5 w-5 mr-2", isNotificationSaved && "fill-current")} />
                        {isNotificationSaved ? "Saved" : "Save & notify me"}
                      </Button>
                      
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full h-12 text-base font-semibold bg-white hover:bg-gray-200 text-black rounded-full shadow-lg"
                        onClick={() => setShowShareDialog(true)}
                        data-testid="button-share-show"
                      >
                        Share show
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Show Button - Bottom (Only shown when show is not live and user is owner) */}
              {!isLive && isShowOwner && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent pb-6 pt-12">
                  <Button
                    size="lg"
                    className="w-[90%] h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl"
                    onClick={() => {
                      if (socket) {
                        socket.emit('start-room', { roomId: id });
                        setLivekitEnabled(true);
                        
                        toast({
                          title: "Starting Show",
                          description: "Connecting to live stream..."
                        });
                      }
                    }}
                    disabled={livekit.isConnecting}
                    data-testid="button-start-show"
                  >
                    {livekit.isConnecting ? (
                      <>
                        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 mr-2" />
                        Start Show
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Right Side Controls (Whatnot Style) - Positioned on video */}
              <div className={cn(
                "absolute right-4 flex flex-col gap-6 z-40",
                isShowOwner && !isLive ? "bottom-24" : 
                (activeAuction && !activeAuction.ended && auctionTimeLeft > 0 && !isShowOwner) ? "bottom-24" : "bottom-4"
              )}>
                <button 
                  className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
                  onClick={() => {
                    if (livekit.isConnected && livekit.toggleAudioMute) {
                      livekit.toggleAudioMute();
                    } else {
                      setMuted(!muted);
                    }
                  }}
                  data-testid="button-sound"
                >
                  {livekit.isConnected ? (
                    livekit.isMuted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />
                  ) : (
                    muted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />
                  )}
                  <span className="text-xs font-semibold">Sound</span>
                </button>

                <button 
                  className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
                  onClick={() => setShowShareDialog(true)}
                  data-testid="button-share"
                >
                  <Share2 className="h-7 w-7" />
                  <span className="text-xs font-semibold">Share</span>
                </button>

                {/* Store button - Only show on mobile */}
                <button 
                  className="lg:hidden flex flex-col items-center gap-1 text-white drop-shadow-lg"
                  onClick={() => setShowMobileProducts(true)}
                  data-testid="button-mobile-products"
                >
                  <ShoppingBag className="h-7 w-7" />
                  <span className="text-xs font-semibold">Store</span>
                </button>

                {/* More options button - Only show for show owner */}
                {isShowOwner && (
                  <button 
                    className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
                    onClick={() => setShowMoreOptionsSheet(true)}
                    data-testid="button-more-options"
                  >
                    <MoreVertical className="h-7 w-7" />
                    <span className="text-xs font-semibold">More</span>
                  </button>
                )}

                {/* Wallet button - Only show for viewers, not hosts */}
                {!isShowOwner && (
                  <button 
                    className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
                    onClick={() => setShowPaymentShippingAlert(true)}
                    data-testid="button-wallet"
                  >
                    <Wallet className="h-7 w-7" />
                    <span className="text-xs font-semibold">Wallet</span>
                  </button>
                )}

                {/* Price and Timer - Only show when there's an auction or pinned product */}
                {(activeAuction || pinnedProduct) && (
                  <div className="flex flex-col items-center gap-0.5 text-white drop-shadow-lg" data-testid="display-current-bid">
                    <div className="flex items-center gap-1">
                      {activeAuction && timeAddedBlink && (
                        <span className="text-lg font-bold text-yellow-400">
                          +{activeAuction.increaseBidBy || 5}
                        </span>
                      )}
                      <span className="text-3xl font-bold">
                        ${activeAuction ? currentBid.toFixed(0) : pinnedProduct ? (pinnedProduct.price || 0).toFixed(0) : '0'}
                      </span>
                    </div>
                    {activeAuction && activeAuction.ended && activeAuction.bids && activeAuction.bids.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-red-500">
                          SOLD
                        </span>
                      </div>
                    )}
                    {activeAuction && !activeAuction.ended && auctionTimeLeft > 0 && (
                      <div className={cn(
                        "flex items-center gap-1 transition-all duration-200",
                        timeAddedBlink && "scale-125 text-yellow-400"
                      )}>
                        {activeAuction.sudden && (
                          <Skull className="h-4 w-4" />
                        )}
                        <span className={cn(
                          "text-sm font-bold",
                          timeAddedBlink ? "text-yellow-400" : "text-red-500"
                        )}>
                          {String(Math.floor(auctionTimeLeft / 60)).padStart(2, '0')}:{(auctionTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Payment & Shipping Sheet - Bottom of video section */}
            <div className="relative z-50">
              <PaymentShippingSheet
                open={showPaymentShippingAlert}
                onOpenChange={setShowPaymentShippingAlert}
              />
            </div>

            {/* Buy Now Dialog */}
            <BuyNowDialog
              open={showBuyNowDialog}
              onOpenChange={setShowBuyNowDialog}
              product={buyNowProduct}
              onOpenPaymentMethods={() => {
                setShowBuyNowDialog(false);
                setShowPaymentShippingAlert(true);
              }}
              onOpenShippingAddresses={() => {
                setShowBuyNowDialog(false);
                setShowPaymentShippingAlert(true);
              }}
            />
          </div>
        </div>

        {/* Right Sidebar - Chat */}
        <div className={`
          ${showMobileChat ? 'fixed inset-0 z-50 bg-black' : 'hidden'}
          lg:flex lg:flex-col lg:relative lg:w-72 lg:z-auto
          bg-black border-l border-zinc-800 flex flex-col
        `} style={{ height: '90vh' }}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-white font-semibold">Chat</h2>
            <button onClick={() => setShowMobileChat(false)} data-testid="button-close-chat">
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Show Stats Card - Above Chat */}
          {isShowOwner && (
            <div className="px-4 py-3 border-b border-zinc-800" data-testid="show-stats-card">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                {/* Gross Sales */}
                <div className="relative overflow-hidden rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-medium text-zinc-400">Gross Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${(show?.salesTotal || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Estimated Orders */}
                <div className="relative overflow-hidden rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-xs font-medium text-zinc-400">Estimated Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {show?.salesCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Giveaway Card - Above Chat Tabs */}
          {activeGiveaway && !activeGiveaway.ended && (
            <div className="px-4 py-4 border-b border-zinc-800" data-testid="giveaway-card-chat">
              <div className="border border-zinc-700 rounded-2xl p-4 bg-black">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      {activeGiveaway.name || 'Giveaway'} #{giveaways.findIndex((g: any) => g._id === activeGiveaway._id) + 1 || '1'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                      <Gift className="h-4 w-4" />
                      <span>{activeGiveaway.participants?.length || 0} entries</span>
                    </div>
                  </div>
                  <button className="text-zinc-400 text-xs underline hover:text-white transition-colors">
                    Terms & Conditions
                  </button>
                </div>

                {/* Action Buttons */}
                {isShowOwner ? (
                  // Host sees "End Giveaway" button
                  <button
                    onClick={handleEndGiveaway}
                    className="w-full h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                    data-testid="button-end-giveaway"
                  >
                    End Giveaway
                  </button>
                ) : activeGiveaway.participants?.includes(currentUserId) ? (
                  // User already entered
                  <button
                    disabled
                    className="w-full h-11 rounded-full bg-green-600 text-white font-semibold text-sm opacity-80"
                  >
                    You're Entered!
                  </button>
                ) : activeGiveaway.whocanenter === 'followers' && !isFollowingHost ? (
                  // Followers only and user is not following
                  <button
                    onClick={handleFollowAndJoinGiveaway}
                    disabled={joinGiveawayMutation.isPending}
                    className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors disabled:opacity-50"
                    data-testid="button-follow-to-enter"
                  >
                    {joinGiveawayMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      'Follow host to enter giveaway'
                    )}
                  </button>
                ) : isAuthenticated ? (
                  // Can enter the giveaway
                  <button
                    onClick={() => joinGiveawayMutation.mutate()}
                    disabled={joinGiveawayMutation.isPending}
                    className="w-full h-11 rounded-full bg-white hover:bg-zinc-100 text-black font-semibold text-sm transition-colors disabled:opacity-50"
                    data-testid="button-join-giveaway-chat"
                  >
                    {joinGiveawayMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      'Enter the giveaway'
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Show Not Started Prompt - Only for owner who hasn't started the show */}
          {isShowOwner && !show?.started && show?.date && (
            <div className="px-4 py-6 border-b border-zinc-800 flex flex-col items-center text-center" data-testid="show-not-started-prompt">
              <p className="text-zinc-400 text-sm mb-1">Show starts</p>
              <p className="text-white text-3xl font-bold mb-4">
                {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short' })} {new Date(show.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
              <button 
                className="w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base transition-colors flex items-center justify-center gap-2"
                data-testid="button-share-show"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="h-5 w-5" />
                Share Show
              </button>
            </div>
          )}

          {/* Chats Header */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-white text-base font-semibold">Chats</h3>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <div ref={chatScrollRef} className="flex-1 px-3 py-3 overflow-y-auto">
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <Avatar 
                        className="h-6 w-6 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (msg.senderId) {
                            window.open(`/profile/${msg.senderId}`, '_blank');
                          }
                        }}
                      >
                        {msg.image_url && (
                          <AvatarImage src={msg.image_url} alt={msg.senderName} />
                        )}
                        <AvatarFallback className="text-xs">{msg.senderName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-xs font-semibold text-white cursor-pointer hover:underline"
                          onClick={() => {
                            if (msg.senderId) {
                              window.open(`/profile/${msg.senderId}`, '_blank');
                            }
                          }}
                        >
                          {msg.senderName}
                        </p>
                        <div className="text-xs">
                          {renderMessageWithMentions(msg.message, msg.mentions)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {isAuthenticated && (
                <div className="flex-shrink-0 p-3 border-t border-zinc-800 bg-black relative">
                  {/* Mention Suggestions - Desktop */}
                  {showMentionDialog && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 z-50">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                          <h3 className="text-sm font-semibold text-white">Tag someone</h3>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <div className="p-2">
                            {userSuggestions.map((suggestedUser) => (
                              <div
                                key={suggestedUser._id || suggestedUser.id}
                                onClick={() => selectMention(
                                  suggestedUser.userName || suggestedUser.firstName,
                                  suggestedUser._id || suggestedUser.id
                                )}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                                data-testid={`mention-suggestion-${suggestedUser._id || suggestedUser.id}`}
                              >
                                <Avatar className="h-8 w-8">
                                  {suggestedUser.profilePhoto && (
                                    <AvatarImage src={suggestedUser.profilePhoto} alt={suggestedUser.userName} />
                                  )}
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {(suggestedUser.userName || suggestedUser.firstName || 'A').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {suggestedUser.userName || suggestedUser.firstName}
                                  </p>
                                  {suggestedUser.firstName && suggestedUser.userName !== suggestedUser.firstName && (
                                    <p className="text-xs text-zinc-400 truncate">
                                      {suggestedUser.firstName} {suggestedUser.lastName || ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isSearchingUsers && (
                              <div className="text-center py-6 text-zinc-400 text-sm">
                                Searching...
                              </div>
                            )}
                            {!isSearchingUsers && userSuggestions.length === 0 && (
                              <div className="text-center py-6 text-zinc-400 text-sm">
                                No users found
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      ref={messageInputRef}
                      placeholder="Say something..."
                      value={message}
                      onChange={(e) => handleMessageChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && message.trim()) {
                          e.preventDefault();
                          handleSendMessage(message);
                        }
                      }}
                      className="flex-1 bg-zinc-900 border-zinc-800 text-white h-9"
                      data-testid="input-chat-message-desktop"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleSendMessage(message)}
                      data-testid="button-send-message-desktop"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Product Action Dialog */}
      <Dialog open={productActionSheet} onOpenChange={setProductActionSheet}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {/* Edit Product */}
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-zinc-800"
              onClick={() => {
                setEditingProduct(selectedProduct);
                setProductActionSheet(false);
                setShowEditProductDialog(true);
              }}
              data-testid="button-sheet-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {/* Pin/Unpin - Only show for buy_now products */}
            {(selectedProduct?.saletype === 'buy_now' || selectedProduct?.listing_type === 'buy_now') && (
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-zinc-800"
                onClick={handlePinProduct}
                data-testid="button-sheet-pin"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                {pinnedProduct?._id === selectedProduct?._id ? 'Unpin' : 'Pin'}
              </Button>
            )}
            
            {/* Start Auction - Only show when show is live/started */}
            {(isLive || show?.started) && isShowOwner && (selectedProduct?.saletype === 'auction' || selectedProduct?.listing_type === 'auction') && (
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-zinc-800"
                onClick={handleOpenAuctionSettings}
                data-testid="button-sheet-start-auction"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Auction
              </Button>
            )}
            
            {/* Start Giveaway - Only show for giveaway products when show is live/started */}
            {(isLive || show?.started) && isShowOwner && (
              selectedProduct?.saletype === 'giveaway' || 
              selectedProduct?.listing_type === 'giveaway' ||
              giveaways.some((g: any) => g._id === selectedProduct?._id)
            ) && (
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-zinc-800"
                onClick={handleStartGiveaway}
                data-testid="button-sheet-start-giveaway"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Giveaway
              </Button>
            )}
            
            {/* Delete Product */}
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:bg-zinc-800 hover:text-red-400"
              onClick={() => {
                setProductActionSheet(false);
                setShowDeleteConfirm(true);
              }}
              data-testid="button-sheet-delete"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auction Settings Dialog */}
      <Dialog open={showAuctionSettingsDialog} onOpenChange={setShowAuctionSettingsDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Auction Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Format Section */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Format</h3>
              <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3 bg-zinc-800">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Sudden Death</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    This means when you're down to 10:01, the last person to bid wins!
                  </p>
                </div>
                <Switch
                  checked={auctionSettings.sudden}
                  onCheckedChange={(checked: boolean) => setAuctionSettings(prev => ({ ...prev, sudden: checked }))}
                  className="ml-3"
                  data-testid="switch-auction-sudden"
                />
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Settings</h3>
              
              {/* Row with Starting Price and Time */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                {/* Starting Price */}
                <div>
                  <label className="text-sm text-white mb-2 block">Starting Price</label>
                  <Input
                    type="number"
                    value={auctionSettings.startingPrice}
                    onChange={(e) => setAuctionSettings(prev => ({ ...prev, startingPrice: parseFloat(e.target.value) || 0 }))}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="input-auction-starting-price"
                  />
                </div>

                {/* Time/Duration Label */}
                <div>
                  <label className="text-sm text-white mb-2 block">Time</label>
                  <div className="flex items-center justify-center h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-md text-white">
                    <span className="text-base font-medium">{auctionSettings.duration}s</span>
                  </div>
                </div>
              </div>

              {/* Time selection chips - Full width below */}
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 5, 10, 15, 20].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setAuctionSettings(prev => ({ ...prev, duration: seconds }))}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${auctionSettings.duration === seconds
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      }
                    `}
                    data-testid={`button-auction-duration-${seconds}`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            {/* Counter-Bid Time */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-white">Counter-Bid Time</h3>
                <div className="group relative">
                  <AlertTriangle className="h-4 w-4 text-zinc-400" />
                  <div className="hidden group-hover:block absolute left-0 top-6 bg-zinc-800 border border-zinc-700 rounded p-2 text-xs text-zinc-300 w-64 z-10">
                    When the auction has less than 5 seconds remaining, any new bids will reset the timer to the selected amount.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 5, 7, 10].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setAuctionSettings(prev => ({ ...prev, counterBidTime: seconds }))}
                    className={`
                      px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${auctionSettings.counterBidTime === seconds
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      }
                    `}
                    data-testid={`button-counter-bid-${seconds}`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
                onClick={() => setShowAuctionSettingsDialog(false)}
                data-testid="button-cancel-auction"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-zinc-200"
                onClick={handleStartAuctionWithSettings}
                data-testid="button-confirm-start-auction"
              >
                Start Auction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Product</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
              onClick={() => setShowDeleteConfirm(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (selectedProduct?._id || selectedProduct?.id) {
                  deleteProductMutation.mutate(selectedProduct._id || selectedProduct.id);
                }
              }}
              disabled={deleteProductMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl max-h-[85vh] p-0">
          <div className="sticky top-0 bg-zinc-900 px-6 pt-6 pb-4 border-b border-zinc-800 z-10">
            <DialogTitle className="text-white text-lg">
              Add Listing
            </DialogTitle>
          </div>
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            <ProductForm
              listingType={addProductType}
              roomId={id}
              onSuccess={() => {
                setShowAddProductDialog(false);
                // Refetch products based on type
                if (addProductType === 'auction') refetchAuction();
                if (addProductType === 'buy_now') refetchBuyNow();
              }}
              onCancel={() => setShowAddProductDialog(false)}
              submitButtonText="Create Product"
              showCancelButton={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl max-h-[85vh] p-0">
          <div className="sticky top-0 bg-zinc-900 px-6 pt-6 pb-4 border-b border-zinc-800 z-10">
            <DialogTitle className="text-white text-lg">
              Edit Listing
            </DialogTitle>
          </div>
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            <ProductForm
              listingType={
                // Check if it's a giveaway by looking in the giveaways array
                giveaways.some((g: any) => g._id === editingProduct?._id)
                  ? 'giveaway'
                  : (editingProduct?.listing_type || editingProduct?.saletype || 'buy_now')
              }
              roomId={id}
              existingProduct={editingProduct}
              onSuccess={() => {
                setShowEditProductDialog(false);
                setEditingProduct(null);
                // Refetch products based on type
                const isGiveaway = giveaways.some((g: any) => g._id === editingProduct?._id);
                const listingType = isGiveaway ? 'giveaway' : (editingProduct?.listing_type || editingProduct?.saletype);
                if (listingType === 'auction') refetchAuction();
                if (listingType === 'buy_now') refetchBuyNow();
                if (listingType === 'giveaway') refetchGiveaways();
              }}
              onCancel={() => {
                setShowEditProductDialog(false);
                setEditingProduct(null);
              }}
              submitButtonText="Update Product"
              showCancelButton={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-white text-black max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-black text-lg font-semibold">Share {showTitle}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowShareDialog(false)}
                data-testid="button-close-share-dialog"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-zinc-600">
              Share this show with friends and family
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            {/* Search Users */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search users..."
                className="pl-10 bg-gray-100 border-gray-300 text-black h-12"
                data-testid="input-search-users"
              />
            </div>
            
            <p className="text-sm text-gray-500">No users found</p>
            
            {/* Share Options */}
            <div className="border-t pt-4">
              <div className="flex justify-around items-center gap-4">
                {/* Copy Link */}
                <button
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/show/${id}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      toast({
                        title: "Link copied",
                        description: "Share link copied to clipboard!"
                      });
                      setShowShareDialog(false);
                    });
                  }}
                  data-testid="button-copy-link"
                >
                  <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center">
                    <LinkIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-black">Copy link</span>
                </button>
                
                {/* Reddit */}
                <button
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/show/${id}`;
                    window.open(`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(showTitle)}`, '_blank');
                    setShowShareDialog(false);
                  }}
                  data-testid="button-share-reddit"
                >
                  <div className="w-14 h-14 rounded-full bg-[#FF4500] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-black">Reddit</span>
                </button>
                
                {/* WhatsApp */}
                <button
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/show/${id}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(showTitle + ' ' + shareUrl)}`, '_blank');
                    setShowShareDialog(false);
                  }}
                  data-testid="button-share-whatsapp"
                >
                  <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-black">WhatsApp</span>
                </button>
                
                {/* X (Twitter) */}
                <button
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/show/${id}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(showTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                    setShowShareDialog(false);
                  }}
                  data-testid="button-share-x"
                >
                  <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-black">X</span>
                </button>
                
                {/* Facebook */}
                <button
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/show/${id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                    setShowShareDialog(false);
                  }}
                  data-testid="button-share-facebook"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-black">Facebook</span>
                </button>
                
                {/* More */}
                <button
                  className="flex flex-col items-center gap-2"
                  data-testid="button-share-more"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center">
                    <MoreHorizontal className="h-6 w-6 text-gray-700" />
                  </div>
                  <span className="text-xs text-black">More</span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={showOrderDetailDialog} onOpenChange={setShowOrderDetailDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md" data-testid="dialog-order-detail">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const isGiveaway = !!selectedOrder.giveaway;
            
            // For giveaway orders, use selectedOrder.giveaway
            // For regular orders, use selectedOrder.items array
            let product, productName, productImage, orderPrice, quantity;
            
            if (isGiveaway) {
              product = selectedOrder.giveaway;
              productName = product?.name || product?.title || 'Giveaway Item';
              productImage = product?.images?.[0] || product?.image;
              orderPrice = 0; // Giveaways are free
              quantity = selectedOrder.quantity || product?.quantity || 1;
            } else {
              // Regular order with items array
              const firstItem = selectedOrder.items?.[0];
              product = firstItem?.productId || firstItem;
              productName = product?.name || product?.title || 'Item';
              productImage = product?.images?.[0] || product?.image;
              orderPrice = selectedOrder.total || selectedOrder.price || (firstItem?.price * (firstItem?.quantity || 1)) || 0;
              quantity = selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1;
            }
            
            const customerName = `${selectedOrder.customer?.firstName || ''} ${selectedOrder.customer?.lastName || ''}`.trim() || selectedOrder.customer?.userName || selectedOrder.customer?.email || 'Customer';
            const customerEmail = selectedOrder.customer?.email || '';
            const shippingFee = selectedOrder.shipping_fee || selectedOrder.shippingFee || 0;
            const tax = selectedOrder.tax || 0;
            const total = orderPrice + shippingFee + tax;
            
            return (
              <div className="space-y-4 py-2">
                {/* Product Info */}
                <div className="flex gap-3">
                  <div className="w-20 h-20 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                    {productImage ? (
                      <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-semibold text-white flex-1">{productName}</h3>
                      {isGiveaway && (
                        <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5">
                          Giveaway
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">Quantity: {quantity}</p>
                    {!isGiveaway && (
                      <p className="text-lg font-bold text-white mt-1">${orderPrice.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                
                {/* Customer Info */}
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-500 mb-1">Customer</p>
                  <p className="text-sm font-medium text-white">{customerName}</p>
                  {customerEmail && (
                    <p className="text-xs text-zinc-400">{customerEmail}</p>
                  )}
                </div>
                
                {/* Shipping Address */}
                {(selectedOrder.customer?.address || selectedOrder.shippingAddress) && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-500 mb-1">Shipping Address</p>
                    {(() => {
                      const address = selectedOrder.customer?.address || selectedOrder.shippingAddress;
                      return (
                        <div className="text-sm text-white space-y-0.5">
                          {address.addrress1 && <p>{address.addrress1}</p>}
                          {address.addrress2 && <p>{address.addrress2}</p>}
                          <p>
                            {address.city && `${address.city}, `}
                            {address.state && `${address.state} `}
                            {(address.zipcode || address.zip) && `${address.zipcode || address.zip}`}
                          </p>
                          {(address.countryCode || address.country) && (
                            <p>{address.countryCode || address.country}</p>
                          )}
                          {address.phone && (
                            <p className="text-xs text-zinc-400 mt-1">Phone: {address.phone}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* Order Summary - Only show for non-giveaways */}
                {!isGiveaway && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-500 mb-2">Order Summary</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Subtotal</span>
                        <span className="text-white">${orderPrice.toFixed(2)}</span>
                      </div>
                      {shippingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Shipping</span>
                          <span className="text-white">${shippingFee.toFixed(2)}</span>
                        </div>
                      )}
                      {tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Tax</span>
                          <span className="text-white">${tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-zinc-800 font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-white">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tracking Info */}
                {selectedOrder.tracking_number && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-500 mb-1">Tracking Number</p>
                    <p className="text-sm font-mono text-primary">{selectedOrder.tracking_number}</p>
                  </div>
                )}
                
                {/* Order Date */}
                {selectedOrder.date && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-500 mb-1">Order Date</p>
                    <p className="text-sm text-white">
                      {format(new Date(selectedOrder.date), "MMMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
                
                {/* Status */}
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-500 mb-1">Status</p>
                  <Badge className="bg-green-600 text-white">
                    {(selectedOrder.status || 'ended').toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* User Actions Dialog */}
      <Dialog open={showUserActionsDialog} onOpenChange={setShowUserActionsDialog}>
        <DialogContent className="bg-white text-black max-w-sm p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>User Actions</DialogTitle>
            <DialogDescription>
              View profile and interact with {selectedChatUser?.senderName || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="h-12 w-12">
                {selectedChatUser?.image_url && (
                  <AvatarImage src={selectedChatUser.image_url} alt={selectedChatUser.senderName} />
                )}
                <AvatarFallback className="text-base">
                  {selectedChatUser?.senderName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-black">{selectedChatUser?.senderName || 'User'}</h3>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
                data-testid="button-follow-user"
              >
                Follow
              </Button>
            </div>

            {/* Actions List */}
            <div className="space-y-1">
              {/* View Profile */}
              <button
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  if (selectedChatUser?.senderId) {
                    navigate(`/profile/${selectedChatUser.senderId}`);
                    setShowUserActionsDialog(false);
                  }
                }}
                data-testid="button-view-profile"
              >
                <User className="h-5 w-5 text-gray-700" />
                <span className="flex-1 text-left text-black">View profile</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              {/* Message */}
              <button
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  navigate('/inbox');
                  setShowUserActionsDialog(false);
                }}
                data-testid="button-message-user"
              >
                <Mail className="h-5 w-5 text-gray-700" />
                <span className="flex-1 text-left text-black">Message</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              {/* Mention in chat */}
              <button
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  if (selectedChatUser?.senderName && selectedChatUser?.senderId) {
                    setMessage(`@${selectedChatUser.senderName} `);
                    setCurrentMentions(prev => [...prev, { 
                      id: selectedChatUser.senderId, 
                      name: selectedChatUser.senderName 
                    }]);
                    setShowUserActionsDialog(false);
                    // Focus on input
                    if (messageInputRef.current) {
                      messageInputRef.current.focus();
                    }
                  }
                }}
                data-testid="button-mention-user"
              >
                <AtSign className="h-5 w-5 text-gray-700" />
                <span className="flex-1 text-left text-black">Mention in chat</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              {/* Block */}
              <button
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  toast({
                    title: "User Blocked",
                    description: `You have blocked ${selectedChatUser?.senderName}`
                  });
                  setShowUserActionsDialog(false);
                }}
                data-testid="button-block-user"
              >
                <Ban className="h-5 w-5 text-gray-700" />
                <span className="flex-1 text-left text-black">Block</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              {/* Report */}
              <button
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  toast({
                    title: "User Reported",
                    description: "Thank you for your report. We'll review it shortly."
                  });
                  setShowUserActionsDialog(false);
                }}
                data-testid="button-report-user"
              >
                <Flag className="h-5 w-5 text-gray-700" />
                <span className="flex-1 text-left text-black">Report</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Host Conflict Dialog */}
      <Dialog open={showHostConflictDialog} onOpenChange={setShowHostConflictDialog}>
        <DialogContent className="bg-white text-black max-w-[95vw] sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-black text-base sm:text-lg">Active Show Detected</DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              You have an active live show running. Joining this show will end your current show.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {conflictingShow && (
              <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Your Current Show:</p>
                <p className="font-semibold text-black text-sm sm:text-base">{conflictingShow.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Started {format(new Date(conflictingShow.activeTime || conflictingShow.date), "h:mm a")}
                </p>
              </div>
            )}
            <p className="text-xs sm:text-sm text-gray-700">
              Do you want to leave your current show and join this one?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto order-2 sm:order-1"
                onClick={() => {
                  setShowHostConflictDialog(false);
                  
                  // Navigate back to the active show
                  if (conflictingShow) {
                    navigate(`/show/${conflictingShow._id}`);
                  }
                  
                  setConflictingShow(null);
                }}
                data-testid="button-cancel-join"
              >
                Stay in Current Show
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:w-auto order-1 sm:order-2"
                onClick={async () => {
                  if (socket && conflictingShow && currentUserId) {
                    console.log('🚪 Leaving previous show:', conflictingShow._id);
                    
                    try {
                      // 1. First, end the previous show by setting ended: true
                      const endResponse = await fetch(`/api/rooms/${conflictingShow._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ ended: true })
                      });
                      
                      if (!endResponse.ok) {
                        console.error('Failed to end previous show');
                      } else {
                        console.log('✅ Previous show ended');
                      }
                      
                      // 2. Then delete the previous show
                      const deleteResponse = await fetch(`/api/rooms/${conflictingShow._id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      
                      if (!deleteResponse.ok) {
                        console.error('Failed to delete previous show');
                      } else {
                        console.log('✅ Previous show deleted');
                      }
                      
                      // 3. Emit leave-room socket event for the previous show
                      socket.emit('leave-room', {
                        roomId: conflictingShow._id,
                        userId: currentUserId
                      });
                      
                      // 4. Close dialog and proceed with joining new show
                      setShowHostConflictDialog(false);
                      setConflictingShow(null);
                      setProceedWithJoin(true);
                      
                      toast({
                        title: "Left Previous Show",
                        description: "Your previous show has been ended.",
                      });
                    } catch (error) {
                      console.error('Error leaving previous show:', error);
                      toast({
                        title: "Error",
                        description: "Failed to leave previous show. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                data-testid="button-confirm-join"
              >
                Leave and Join New Show
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
