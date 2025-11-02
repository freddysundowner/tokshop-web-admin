import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bookmark, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

interface ShowCardOwner {
  _id?: string;
  id?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
}

interface ShowCardData {
  _id?: string;
  id?: string;
  title: string;
  thumbnail?: string;
  coverImage?: string;
  description?: string;
  status?: string;
  category?: string | { name: string };
  owner?: ShowCardOwner;
  viewers?: any[];
  viewersCount?: number;
  invitedhostIds?: string[];
  shippingCoverage?: string;
  freeShipping?: boolean;
  started?: boolean;
  date?: string | Date;
  shipping_settings?: {
    seller_pays?: boolean;
    buyer_pays?: boolean;
    shippingCostMode?: string;
    priorityMailEnabled?: boolean;
    groundAdvantageEnabled?: boolean;
    reducedShippingCapAmount?: number;
    freePickupEnabled?: boolean;
  };
}

interface ShowCardProps {
  show: ShowCardData;
  currentUserId: string;
  variant?: 'grid' | 'profile';
  categoryName?: string;
  showHostInfo?: boolean;
}

const PlaceholderPattern = () => (
  <div className="absolute inset-0 grid grid-cols-8 grid-rows-12 gap-0">
    {Array.from({ length: 96 }).map((_, i) => (
      <div key={i} className="flex items-center justify-center" style={{ opacity: 0.1 + (Math.random() * 0.3) }}>
        <svg viewBox="0 0 200 200" className="w-full h-full text-gray-600">
          <path fill="currentColor" d="M100 30 L170 100 L100 170 L30 100 Z"/>
        </svg>
      </div>
    ))}
  </div>
);

export function ShowCard({ show, currentUserId, variant = 'grid', categoryName, showHostInfo = true }: ShowCardProps) {
  const { toast } = useToast();
  
  const showId = show._id || show.id || '';
  const viewerCount = show.viewers?.length || show.viewersCount || 0;
  const hostName = show.owner?.userName || show.owner?.firstName?.trim() || 'Host';
  const hostAvatar = show.owner?.profilePhoto && show.owner.profilePhoto.trim() ? show.owner.profilePhoto : '';
  const ownerId = show.owner?._id || show.owner?.id || '';
  
  const hasFreeShipping = show.shipping_settings?.freePickupEnabled === true;
  const hasReducedShipping = show.shipping_settings?.shippingCostMode === 'buyer_pays_up_to';
  
  const isOwnShow = currentUserId === ownerId;
  const isBookmarked = show.invitedhostIds?.includes(currentUserId) || false;
  const bookmarkCount = show.invitedhostIds?.length || 0;

  // Badge logic
  const showDate = show.date ? (typeof show.date === 'string' ? parseISO(show.date) : show.date) : null;
  const isShowStarted = show.started === true;
  
  // Live: Only when show has actually started
  const isLive = isShowStarted;
  
  // Starting Soon: Show if date is past (including today/tomorrow) and show hasn't started yet
  const isScheduledDatePast = showDate ? isPast(showDate) : false;
  const showStartingSoon = !isShowStarted && isScheduledDatePast;
  
  // Format date for display (for future dates only)
  const getFormattedDate = () => {
    if (!showDate) return null;
    if (isScheduledDatePast) return null; // Past dates show "Starting Soon"
    if (isToday(showDate)) return `Today, ${format(showDate, 'h:mm a')}`; // e.g., "Today, 3:30 PM"
    if (isTomorrow(showDate)) return `Tomorrow, ${format(showDate, 'h:mm a')}`; // e.g., "Tomorrow, 3:30 PM"
    return format(showDate, 'MMM d, h:mm a'); // e.g., "Jan 15, 3:30 PM"
  };
  
  const formattedDate = getFormattedDate();
  
  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const currentInvitedIds = show.invitedhostIds || [];
      const isAlreadySaved = currentInvitedIds.includes(currentUserId);
      const invitedhostIds = isAlreadySaved
        ? currentInvitedIds.filter((id: string) => id !== currentUserId)
        : [...currentInvitedIds, currentUserId];
      
      const response = await fetch(`/api/rooms/${showId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ invitedhostIds })
      });
      
      if (response.ok) {
        toast({
          title: isAlreadySaved ? "Notification Removed" : "Notification Set",
          description: isAlreadySaved 
            ? "You won't be notified about this show"
            : "We'll notify you when the show starts!"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification.",
        variant: "destructive"
      });
    }
  };
  
  const getHostInitials = () => {
    const firstName = show.owner?.firstName || '';
    const lastName = show.owner?.lastName || '';
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return hostName.charAt(0).toUpperCase();
  };
  
  const displayCategory = categoryName || (typeof show.category === 'object' && show.category ? show.category.name : show.category);
  
  if (variant === 'profile') {
    return (
      <div className="group cursor-pointer" data-testid={`show-${showId}`}>
        {/* Host Avatar */}
        <div className="flex items-center gap-2 mb-2 px-0.5">
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={hostAvatar} />
            <AvatarFallback className="text-xs">{getHostInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground truncate">
            {hostName}
          </span>
        </div>

        {/* Show Thumbnail Container */}
        <div className="relative">
          <Link href={`/show/${showId}`}>
            <div className="relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden mb-2">
              {show.thumbnail ? (
                <img
                  src={show.thumbnail}
                  alt={show.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <PlaceholderPattern />
              )}
              
              {/* Top-left: Live badge or date badge */}
              <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                {isLive && (
                  <div className="bg-red-600 text-white text-xs px-2 py-0.5 font-bold rounded flex items-center gap-1" data-testid={`badge-live-${showId}`}>
                    Live - {viewerCount}
                  </div>
                )}
                
                {!isLive && formattedDate && (
                  <div className="bg-white/90 backdrop-blur-sm text-black text-xs px-2 py-0.5 rounded font-medium" data-testid={`badge-date-${showId}`}>
                    {formattedDate}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Top-right: Viewer count badge and bookmark - positioned absolutely */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
            {!isLive && viewerCount > 0 && (
              <div className="bg-white/90 backdrop-blur-sm text-black text-xs px-1.5 py-0.5 rounded font-semibold" data-testid={`badge-viewers-${showId}`}>
                {viewerCount}
              </div>
            )}
            
            {currentUserId && !isOwnShow && (
              <button 
                className="bg-white/90 backdrop-blur-sm text-black rounded p-1 hover:bg-white transition-colors"
                data-testid={`button-bookmark-${showId}`}
                onClick={handleBookmarkToggle}
              >
                <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
              </button>
            )}
          </div>
        </div>
        
        {/* Show Info */}
        <div className="space-y-1 px-0.5">
          <p className="text-sm font-medium line-clamp-2 leading-snug text-foreground" data-testid={`show-title-${showId}`}>
            {show.title || 'Untitled Show'}
          </p>
          {displayCategory && (
            <p className="text-xs text-muted-foreground truncate">
              {displayCategory}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Grid variant (marketplace and category)
  return (
    <div 
      className="group cursor-pointer"
      data-testid={`card-giveaway-${showId}`}
    >
      <div className="space-y-1.5">
        {/* Host Info */}
        {showHostInfo && (
          <Link href={`/profile/${ownerId}`} className="flex items-center gap-1.5 px-0.5 group/host" data-testid={`link-host-${showId}`}>
            <Avatar className="h-6 w-6 flex-shrink-0" data-testid={`avatar-${showId}`}>
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="text-xs">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground truncate group-hover/host:underline">
              {hostName}
            </span>
          </Link>
        )}

        {/* Show Thumbnail Container - relative positioned to hold bookmark button */}
        <div className="relative">
          <Link href={`/show/${showId}`} data-testid={`link-giveaway-${showId}`}>
            <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-gray-800">
              {show.thumbnail || show.coverImage ? (
                <img
                  src={show.thumbnail || show.coverImage}
                  alt={show.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <PlaceholderPattern />
              )}
              
              {/* Top-left: Live badge + Starting Soon + Free shipping badge */}
              <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                {isLive && (
                  <div 
                    className="bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1.5 shadow-lg"
                    data-testid={`badge-live-${showId}`}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    LIVE
                    <span className="font-semibold">{viewerCount}</span>
                  </div>
                )}
                
                {showStartingSoon && !isLive && (
                  <div 
                    className="bg-white/90 backdrop-blur-sm text-black px-2 py-0.5 text-xs rounded"
                    data-testid={`badge-starting-soon-${showId}`}
                  >
                    Starting Soon
                  </div>
                )}
                
                {formattedDate && !isLive && !showStartingSoon && (
                  <div 
                    className="bg-white/90 backdrop-blur-sm text-black px-2 py-0.5 text-xs rounded"
                    data-testid={`badge-date-${showId}`}
                  >
                    {formattedDate}
                  </div>
                )}
                
                {hasFreeShipping && (
                  <div 
                    className="bg-green-600 text-white font-semibold px-2 py-0.5 text-xs rounded"
                    data-testid={`badge-free-shipping-${showId}`}
                  >
                    Free shipping
                  </div>
                )}
                
                {!hasFreeShipping && hasReducedShipping && (
                  <div 
                    className="bg-blue-600 text-white font-semibold px-2 py-0.5 text-xs rounded"
                    data-testid={`badge-reduced-shipping-${showId}`}
                  >
                    Reduced shipping
                  </div>
                )}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
          </Link>

          {/* Top-right: Bookmark badge - OUTSIDE Link, positioned absolutely - Show only if not own show */}
          {currentUserId && !isOwnShow && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <button 
                className={cn(
                  "font-semibold px-2 py-0.5 text-xs rounded-full flex items-center gap-1 cursor-pointer hover:opacity-90 transition-opacity",
                  isBookmarked ? "bg-yellow-400 text-black" : "bg-white text-black"
                )}
                data-testid={`badge-bookmarks-${showId}`}
                onClick={handleBookmarkToggle}
              >
                <Bookmark className={cn("h-3 w-3", isBookmarked && "fill-current")} />
                {bookmarkCount > 0 && bookmarkCount}
              </button>
            </div>
          )}
        </div>

        {/* Show Info */}
        <div className="space-y-0.5 px-0.5">
          <h3 className="text-sm font-medium line-clamp-2 leading-snug text-foreground">
            {show.title}
          </h3>
          
          <div className="flex items-center gap-1 text-xs">
            {displayCategory && <span className="text-primary font-medium">{displayCategory}</span>}
            {show.description && displayCategory && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground line-clamp-1">{show.description}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
