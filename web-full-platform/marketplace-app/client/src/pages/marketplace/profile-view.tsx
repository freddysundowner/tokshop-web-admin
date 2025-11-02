import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Share2, MessageCircle, Star, ShoppingBag, Calendar, MoreVertical, Ban, Flag, ChevronDown, ChevronUp, Waves } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { getOrCreateChat } from "@/lib/firebase-chat";
import { ShowCard } from "@/components/show-card";

// Review Card Component with expandable details
function ReviewCard({ review }: { review: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-300 text-gray-300"
        )}
      />
    ));
  };

  const hasDetailedRatings = review.overall || review.shipping || review.packaging || review.accuracy;

  return (
    <div className="border border-border rounded-lg p-4 sm:p-6" data-testid={`review-${review._id}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage src={review.from?.profilePhoto} />
          <AvatarFallback>
            {review.from?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm sm:text-base">
                {review.from?.firstName || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString(undefined, { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {renderStars(review.overall || review.rating || 0)}
              <span className="text-sm font-semibold ml-1">
                {(review.overall || review.rating || 0).toFixed(1)}
              </span>
            </div>
          </div>
          
          <p className="text-sm sm:text-base text-foreground mb-3">{review.review}</p>
          
          {hasDetailedRatings && (
            <>
              {isExpanded && (
                <div className="space-y-2 mb-3 pt-3 border-t border-border">
                  {review.overall && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall</span>
                      <div className="flex items-center gap-1">
                        {renderStars(review.overall)}
                        <span className="text-sm font-semibold ml-1">{review.overall.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                  {review.shipping && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Shipping</span>
                      <div className="flex items-center gap-1">
                        {renderStars(review.shipping)}
                        <span className="text-sm font-semibold ml-1">{review.shipping.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                  {review.packaging && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Packaging</span>
                      <div className="flex items-center gap-1">
                        {renderStars(review.packaging)}
                        <span className="text-sm font-semibold ml-1">{review.packaging.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                  {review.accuracy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Accuracy</span>
                      <div className="flex items-center gap-1">
                        {renderStars(review.accuracy)}
                        <span className="text-sm font-semibold ml-1">{review.accuracy.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                data-testid={`button-toggle-review-${review._id}`}
              >
                {isExpanded ? (
                  <>
                    See less <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    See more <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileView() {
  usePageTitle('Profile');
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/profile/:userId");
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("shows");
  const [isFollowing, setIsFollowing] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Handle both /profile/:userId and /user?id=userId routes
  let userId = params?.userId;
  if (!userId && location.startsWith('/user')) {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    userId = urlParams.get('id') || undefined;
  }
  
  // Fetch user data from API based on user ID
  const currentUserId = (currentUser as any)?._id || currentUser?.id;
  
  const { data: profileUser, isLoading } = useQuery<any>({
    queryKey: ['/api/profile', userId],
    queryFn: async () => {
      const response = await fetch(`/api/profile/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      // API returns data directly or nested under 'data' key
      return data.data || data;
    },
    enabled: !!userId && userId !== currentUserId,
    staleTime: 0,
  });

  // Fetch reviews for this user
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<any>({
    queryKey: ['/api/users/review', userId || currentUserId],
    queryFn: async () => {
      const userIdToFetch = userId || currentUserId;
      if (!userIdToFetch) return { reviews: [] };
      
      const response = await fetch(`/api/users/review/${userIdToFetch}`);
      if (!response.ok) return { reviews: [] };
      return response.json();
    },
    enabled: !!(userId || currentUserId),
    staleTime: 0,
  });

  // Update follow and block status when profileUser changes - MUST be before early returns
  useEffect(() => {
    if (profileUser) {
      if (profileUser.isfollowing !== undefined) {
        setIsFollowing(profileUser.isfollowing);
      }
      if (profileUser.isblocked !== undefined) {
        setIsBlocked(profileUser.isblocked);
      }
    }
  }, [profileUser]);

  // Fetch products for this user
  const { data: userProductsData, isLoading: productsLoading } = useQuery<any>({
    queryKey: ['/api/products', 'user', userId || currentUserId],
    queryFn: async () => {
      const userIdToFetch = userId || currentUserId;
      if (!userIdToFetch) return { products: [] };
      
      const params = new URLSearchParams({
        userid: userIdToFetch,
        roomid: '',
        type: 'inventory',
        saletype: '',
        category: '',
        page: '1',
        limit: '15',
        featured: 'true',
        status: 'active',
      });
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) return { products: [] };
      return response.json();
    },
    enabled: !!(userId || currentUserId),
    staleTime: 0,
  });

  // Fetch shows for this user with infinite scroll
  const {
    data: userShowsData,
    fetchNextPage: fetchNextShowsPage,
    hasNextPage: hasNextShowsPage,
    isFetchingNextPage: isFetchingNextShows,
  } = useInfiniteQuery({
    queryKey: ['/api/rooms', 'user', userId || currentUserId],
    queryFn: async ({ pageParam = 1 }) => {
      const userIdToFetch = userId || currentUserId;
      if (!userIdToFetch) return { rooms: [], pages: 0 };
      
      const params = new URLSearchParams({
        userid: userIdToFetch,
        page: String(pageParam),
        limit: '20',
        status: 'active',
      });
      
      if (currentUserId) {
        params.set('currentUserId', currentUserId);
      }
      
      const response = await fetch(`/api/rooms?${params.toString()}`);
      if (!response.ok) return { rooms: [], pages: 0 };
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalItems = lastPage.totalDoc || 0;
      const itemsPerPage = Math.max(lastPage.limits || 20, 1);
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!(userId || currentUserId),
    staleTime: 0,
  });

  // Infinite scroll observer for shows
  const showsObserverTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextShowsPage && !isFetchingNextShows) {
          fetchNextShowsPage();
        }
      },
      { threshold: 0, rootMargin: '100px' }
    );

    const currentTarget = showsObserverTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextShowsPage, isFetchingNextShows, fetchNextShowsPage]);

  // Display user - use profileUser if found, otherwise current user
  const displayUser = profileUser || currentUser;
  const isOwnProfile = !userId || userId === currentUserId;

  // Follow mutation - MUST be before early returns
  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/follow/${currentUserId}/${userId}`, {
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
      setIsFollowing(true);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "Success",
        description: `You are now following @${displayUser?.userName || 'user'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation - MUST be before early returns
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/unfollow/${currentUserId}/${userId}`, {
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
      setIsFollowing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "Success",
        description: `You unfollowed @${displayUser?.userName || 'user'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow user",
        variant: "destructive",
      });
    },
  });

  // Block mutation - MUST be before early returns
  const blockMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/block/${currentUserId}/${userId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to block user');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsBlocked(true);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "User Blocked",
        description: `You have blocked @${displayUser?.userName || 'user'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      });
    },
  });

  // Unblock mutation - MUST be before early returns
  const unblockMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/unblock/${currentUserId}/${userId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unblock user');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsBlocked(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "User Unblocked",
        description: `You have unblocked @${displayUser?.userName || 'user'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
        variant: "destructive",
      });
    },
  });

  // Report mutation - MUST be before early returns
  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reason,
          reported_by: currentUserId,
          reported: userId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to report user');
      }
      return response.json();
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason("");
      toast({
        title: "User Reported",
        description: `Thank you for reporting @${displayUser?.userName || 'user'}. We will review this report.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report user",
        variant: "destructive",
      });
    },
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If user not found, show error
  if (userId && !profileUser && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-muted-foreground mb-4">This user does not exist.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const user = displayUser;
    if (user?.userName) {
      return user.userName[0].toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    return 'U';
  };

  // Handle follow/unfollow button click
  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  // Handle message button click
  const handleMessage = async () => {
    if (!userId || !currentUserId) return;
    
    try {
      setMessagingLoading(true);
      
      const currentUserData = {
        firstName: (currentUser as any)?.firstName || '',
        lastName: (currentUser as any)?.lastName || '',
        userName: (currentUser as any)?.userName || '',
        profilePhoto: (currentUser as any)?.profilePhoto || ''
      };
      
      const otherUserData = {
        firstName: displayUser?.firstName || '',
        lastName: displayUser?.lastName || '',
        userName: displayUser?.userName || '',
        profilePhoto: displayUser?.profilePhoto || ''
      };
      
      const chatId = await getOrCreateChat(
        currentUserId,
        userId,
        currentUserData,
        otherUserData
      );
      
      setLocation(`/inbox/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to open chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMessagingLoading(false);
    }
  };

  // Handle block/unblock toggle
  const handleBlockToggle = () => {
    if (isBlocked) {
      unblockMutation.mutate();
    } else {
      blockMutation.mutate();
    }
  };

  // Handle report user
  const handleReportUser = () => {
    setShowReportDialog(true);
  };

  // Handle submit report
  const handleSubmitReport = () => {
    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reporting this user",
        variant: "destructive",
      });
      return;
    }
    reportMutation.mutate(reportReason.trim());
  };

  // Handle share profile
  const handleShare = () => {
    setShowShareDialog(true);
  };

  const getShareUrl = () => {
    return `${window.location.origin}/user?id=${userId || currentUserId}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast({
        title: "Link Copied",
        description: "Profile link copied to clipboard",
      });
      setShowShareDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleShareTo = (platform: string) => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(`Check out ${userDisplayName}'s profile`);
    
    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${url}&title=${text}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      setShowShareDialog(false);
    }
  };
  
  // Get user data for display
  const userAvatar = displayUser?.profilePhoto || '';
  const userDisplayName = displayUser?.firstName || displayUser?.userName || 'User';
  const userUsername = displayUser?.userName || 'user';
  const userBio = displayUser?.bio || '';
  const userFollowers = displayUser?.followersCount || displayUser?.followers?.length || 0;
  const userFollowing = displayUser?.followingCount || displayUser?.following?.length || 0;

  const upcomingShows = userShowsData?.pages?.flatMap(page => page.rooms || []) || [];
  const userProducts = userProductsData?.products || [];

  // Legacy mock data (keeping structure for fallback)
  const upcomingShowsLegacy = [
    {
      id: 1,
      status: "Live",
      date: "164",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 83,
      title: "SOLID GOLD GIVEAWAYS"
    },
    {
      id: 2,
      date: "Tomorrow 22:04",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 64,
      title: "SOLID GOLD GIVEAWAYS"
    },
    {
      id: 3,
      date: "Thu 23:04",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 81,
      title: "SOLID GOLD GIVEAWAYS"
    },
    {
      id: 4,
      date: "Fri 22:04",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 45,
      title: "SOLID GOLD GIVEAWAYS"
    },
    {
      id: 5,
      date: "Sat 22:04",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 42,
      title: "SOLID GOLD GIVEAWAYS"
    },
    {
      id: 6,
      date: "Sun 22:04",
      thumbnail: "https://via.placeholder.com/300x400",
      viewers: 42,
      title: "SOLID GOLD GIVEAWAYS"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="page-profile-view">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-background">
        <div className="w-[90%] mx-auto">
        {/* Profile Header Section */}
        <div className="bg-card border-b border-border px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20" data-testid="avatar-profile-view">
                  <AvatarImage src={userAvatar} alt={userUsername} />
                  <AvatarFallback className="bg-teal-500 text-white text-xl sm:text-2xl font-bold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {displayUser?.seller && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full w-4 h-4 sm:w-5 sm:h-5 border-2 border-background" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate" data-testid="text-display-name">
                    {userDisplayName}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  @{userUsername}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{displayUser?.averagereviews || '0'} Rating</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleShare}
                data-testid="button-share" 
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              {!isOwnProfile && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMessage}
                    disabled={messagingLoading}
                    data-testid="button-message" 
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span>{messagingLoading ? "Loading..." : "Message"}</span>
                  </Button>
                  <Button 
                    variant={isFollowing ? "outline" : "default"} 
                    size="sm" 
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                    data-testid="button-follow"
                  >
                    {followMutation.isPending || unfollowMutation.isPending 
                      ? "Loading..." 
                      : isFollowing 
                        ? "Following" 
                        : "Follow"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-more-options" className="h-8 w-8 sm:h-9 sm:w-9">
                        <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-testid="menu-more-options">
                      <DropdownMenuItem 
                        onClick={handleBlockToggle} 
                        disabled={blockMutation.isPending || unblockMutation.isPending}
                        data-testid="menu-item-block"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {blockMutation.isPending || unblockMutation.isPending 
                          ? "Loading..." 
                          : isBlocked 
                            ? "Unblock User" 
                            : "Block User"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleReportUser} data-testid="menu-item-report" className="text-destructive">
                        <Flag className="h-4 w-4 mr-2" />
                        Report User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {isOwnProfile && (
                <Link href="/profile" className="flex-1 sm:flex-initial">
                  <Button variant="default" size="sm" data-testid="button-edit-profile" className="w-full sm:w-auto">
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {userBio && (
            <div className="mb-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {userBio}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm mb-4">
            <button className="hover:underline" data-testid="button-following-stat">
              <span className="font-bold text-foreground">{userFollowing.toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">following</span>
            </button>
            <button className="hover:underline" data-testid="button-followers-stat">
              <span className="font-bold text-foreground">{userFollowers.toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">followers</span>
            </button>
          </div>

        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-10 sm:h-12 p-0 px-4 sm:px-6 overflow-x-auto">
            <TabsTrigger 
              value="shop" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 sm:px-6 text-sm"
              data-testid="tab-shop"
            >
              Shop
            </TabsTrigger>
            <TabsTrigger 
              value="shows" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 sm:px-6 text-sm"
              data-testid="tab-shows"
            >
              Shows
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 sm:px-6 text-sm"
              data-testid="tab-reviews"
            >
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="p-4 sm:p-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4" data-testid="text-shop-products">
                Products ({userProducts.length})
              </h2>
              
              {productsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted rounded-lg mb-2"></div>
                      <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : userProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products in shop</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {userProducts.map((product: any) => (
                    <Link href={`/product/${product._id}`} key={product._id || product.id}>
                      <div 
                        className="group cursor-pointer"
                        data-testid={`product-${product._id}`}
                      >
                      <div className="aspect-square overflow-hidden rounded-lg mb-2 bg-muted relative">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name || 'Product'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
                          </div>
                        )}
                        {product.tokshow && (
                          <div className="absolute top-2 right-2">
                            <Badge 
                              variant="secondary" 
                              className="bg-primary/90 text-primary-foreground hover:bg-primary text-xs gap-1"
                              data-testid={`badge-in-show-${product._id}`}
                            >
                              <Waves className="w-3 h-3" />
                              In Show
                            </Badge>
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-sm truncate text-foreground" data-testid={`product-name-${product._id}`}>
                        {product.productName || product.name || 'Untitled Product'}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`product-price-${product._id}`}>
                        ${(product.price || 0).toFixed(2)}
                      </p>
                      {product.quantity !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                        </p>
                      )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shows" className="p-4 sm:p-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4" data-testid="text-upcoming-shows">
                Shows ({upcomingShows.length})
              </h2>
              
              {upcomingShows.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No shows yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {upcomingShows.map((show: any) => (
                      <ShowCard
                        key={show._id || show.id}
                        show={show}
                        currentUserId={currentUserId || ''}
                        variant="profile"
                        showHostInfo={false}
                      />
                    ))}
                  </div>
                  
                  {/* Infinite scroll trigger */}
                  <div ref={showsObserverTarget} className="h-20 flex items-center justify-center mt-4">
                    {isFetchingNextShows && (
                      <p className="text-sm text-muted-foreground">Loading more shows...</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="p-4 sm:p-6">
            {reviewsLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading reviews...</p>
              </div>
            ) : (reviewsData?.reviews || []).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {(reviewsData?.reviews || []).map((review: any) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Share Profile Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {userDisplayName}'s profile</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 group"
                data-testid="button-copy-link"
              >
                <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center group-hover:opacity-80 transition-opacity">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs text-foreground">Copy link</span>
              </button>
              
              <button
                onClick={() => handleShareTo('reddit')}
                className="flex flex-col items-center gap-2 group"
                data-testid="button-share-reddit"
              >
                <div className="h-14 w-14 rounded-full bg-[#FF4500] flex items-center justify-center group-hover:opacity-80 transition-opacity">
                  <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                </div>
                <span className="text-xs text-foreground">Reddit</span>
              </button>
              
              <button
                onClick={() => handleShareTo('whatsapp')}
                className="flex flex-col items-center gap-2 group"
                data-testid="button-share-whatsapp"
              >
                <div className="h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center group-hover:opacity-80 transition-opacity">
                  <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <span className="text-xs text-foreground">WhatsApp</span>
              </button>
              
              <button
                onClick={() => handleShareTo('x')}
                className="flex flex-col items-center gap-2 group"
                data-testid="button-share-x"
              >
                <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center group-hover:opacity-80 transition-opacity">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-xs text-foreground">X</span>
              </button>
              
              <button
                onClick={() => handleShareTo('facebook')}
                className="flex flex-col items-center gap-2 group"
                data-testid="button-share-facebook"
              >
                <div className="h-14 w-14 rounded-full bg-[#1877F2] flex items-center justify-center group-hover:opacity-80 transition-opacity">
                  <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs text-foreground">Facebook</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting @{displayUser?.userName || 'user'}. 
              This will help us review your report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe why you're reporting this user..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-report-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReportDialog(false);
                setReportReason("");
              }}
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
