import { useState, useEffect, useRef } from 'react';
import { Link, useRoute } from 'wouter';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { ChevronRight } from 'lucide-react';
import { ShowCard } from '@/components/show-card';

interface Category {
  _id: string;
  name: string;
  icon?: string;
  image?: string;
  viewersCount?: number;
  subCategories?: Category[];
  followers?: string[];
}

interface Room {
  _id: string;
  title: string;
  thumbnail?: string;
  coverImage?: string;
  description?: string;
  owner: {
    _id: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string;
  };
  viewersCount?: number;
  status: string;
  invitedhostIds?: string[];
  shippingCoverage?: string;
  freeShipping?: boolean;
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

export default function Category() {
  const [, params] = useRoute('/category/:id');
  const categoryId = params?.id;
  const [following, setFollowing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user session
  const { data: sessionData } = useQuery<{ success: boolean; data: { _id: string; id: string } }>({
    queryKey: ['/api/auth/session'],
  });
  
  const currentUserId = sessionData?.data?._id || sessionData?.data?.id;

  // Fetch category details
  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['/api/categories'],
  });

  const categories = categoriesData?.categories || [];
  
  // Find current category - could be a parent or a subcategory
  let currentCategory = categories.find(cat => cat._id === categoryId);
  let parentCategory: Category | undefined = undefined;
  
  // If not found as parent, search in subcategories
  if (!currentCategory) {
    for (const cat of categories) {
      const subCat = cat.subCategories?.find(sub => sub._id === categoryId);
      if (subCat) {
        currentCategory = subCat;
        parentCategory = cat;
        break;
      }
    }
  }
  
  // Fetch rooms with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: roomsLoading,
  } = useInfiniteQuery({
    queryKey: ['/api/rooms', categoryId],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: String(pageParam),
        limit: '20',
        status: 'active',
      });

      if (categoryId) {
        queryParams.set('category', categoryId);
      }

      const response = await fetch(`/api/rooms?${queryParams}`);
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
    enabled: !!categoryId,
  });

  const rooms = data?.pages?.flatMap(page => page.rooms || []) || [];

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const subCategories = currentCategory?.subCategories || [];
  const isSubCategory = !!parentCategory;

  usePageTitle(currentCategory?.name || 'Category');

  // Follow category mutation - MUST be before early returns
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !categoryId) {
        throw new Error('User not logged in');
      }
      
      const response = await fetch(`/api/category/follow/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userid: currentUserId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to follow category');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setFollowing(true);
      // Invalidate categories cache to refetch with updated followers
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow category",
        variant: "destructive",
      });
    },
  });

  // Unfollow category mutation - MUST be before early returns
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !categoryId) {
        throw new Error('User not logged in');
      }
      
      const response = await fetch(`/api/category/unfollow/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userid: currentUserId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unfollow category');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setFollowing(false);
      // Invalidate categories cache to refetch with updated followers
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow category",
        variant: "destructive",
      });
    },
  });

  // Update follow state based on category data and scroll to top when category changes
  useEffect(() => {
    if (currentCategory && currentUserId) {
      // Check if current user is in the followers array
      const isFollowing = currentCategory.followers?.includes(currentUserId) || false;
      setFollowing(isFollowing);
    } else {
      setFollowing(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categoryId, currentCategory, currentUserId]);

  // Handle follow/unfollow button click
  const handleFollowClick = () => {
    if (!currentUserId) {
      toast({
        title: "Login Required",
        description: "Please log in to follow categories",
        variant: "destructive",
      });
      return;
    }
    
    if (following) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const formatViewers = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (!currentCategory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <Link href="/browse">
            <Button>Back to Browse</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="page-category">

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-background">
        <div className="flex justify-center w-full">
          <div className="w-full lg:w-[90%] px-2 py-3 lg:p-6">
            {/* Breadcrumb for Subcategories */}
            {isSubCategory && parentCategory && (
              <div className="flex items-center gap-2 mb-3 text-sm" data-testid="breadcrumb">
                <Link href={`/category/${parentCategory._id}`} className="text-primary hover:underline">
                  {parentCategory.name}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{currentCategory?.name}</span>
              </div>
            )}

            {/* Category Title & Follow Button */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground" data-testid="heading-category">
                {currentCategory?.name}
              </h1>
              <Button
                className={cn(
                  "rounded-full font-semibold px-4 lg:px-6 h-9 lg:h-10",
                  following 
                    ? "bg-muted text-foreground hover:bg-muted/80" 
                    : "bg-yellow-400 text-black hover:bg-yellow-500"
                )}
                onClick={handleFollowClick}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                data-testid="button-follow-category"
              >
                {followMutation.isPending || unfollowMutation.isPending 
                  ? 'Loading...' 
                  : following ? 'Following' : 'Follow'}
              </Button>
            </div>

            {/* Subcategories - Horizontal Scroll (only for parent categories) */}
            {!isSubCategory && subCategories.length > 0 && (
              <div className="mb-6 overflow-x-auto scrollbar-hide" data-testid="subcategories-container">
                <div className="flex gap-3">
                  {subCategories.map((subCat) => {
                    const iconUrl = subCat.icon ? `https://api.iconaapp.com/${subCat.icon}` : '';
                    
                    return (
                      <Link
                        key={subCat._id}
                        href={`/category/${subCat._id}`}
                        className={cn(
                          "relative flex-shrink-0 h-16 lg:h-20 rounded-lg overflow-hidden transition-all",
                          "hover:ring-2 hover:ring-primary"
                        )}
                        data-testid={`subcategory-${subCat._id}`}
                      >
                        <div className="relative h-full w-32 lg:w-40">
                          {/* Background Image */}
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={subCat.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
                          )}
                          
                          {/* Dark Overlay */}
                          <div className="absolute inset-0 bg-black/30" />
                          
                          {/* Content */}
                          <div className="relative h-full flex flex-col justify-between p-2.5">
                            {/* Live Badge with Viewer Count */}
                            {(subCat.viewersCount ?? 0) > 0 && (
                              <div className="flex items-center gap-1 self-start">
                                <div className="w-2 h-2 rounded-full bg-red-600" />
                                <span className="text-white text-xs font-semibold">
                                  {formatViewers(subCat.viewersCount ?? 0)} viewers
                                </span>
                              </div>
                            )}
                            
                            {/* Category Name */}
                            <div className="text-white font-bold text-sm text-left leading-tight">
                              {subCat.name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Shows Grid */}
            {roomsLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading shows...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No live shows in this category</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-4" data-testid="live-shows-grid">
                  {rooms.map((room) => (
                    <ShowCard
                      key={room._id}
                      show={room as any}
                      currentUserId={currentUserId || ''}
                      variant="grid"
                      categoryName={currentCategory?.name}
                    />
                  ))}
                </div>
                
                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
                  {isFetchingNextPage && (
                    <p className="text-sm text-muted-foreground">Loading more shows...</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
