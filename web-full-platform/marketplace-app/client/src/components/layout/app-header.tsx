import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, MessageSquare, Menu, Plus, Calendar, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ProfileDrawer } from '@/components/profile-drawer';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
  hideLogo?: boolean;
  hideNavigation?: boolean;
}

export function AppHeader({ onMobileMenuToggle, mobileMenuOpen = false, onMobileMenuClose, hideLogo = false, hideNavigation = false }: AppHeaderProps) {
  const { settings } = useSettings();
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const [, setLocation] = useLocation();
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Check if we're on a show page
  const [location] = useLocation();
  
  const userId = (user as any)?._id || user?.id;
  
  // Fetch fresh user data to check current seller status for header buttons
  const { data: freshHeaderData } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId && !!isAuthenticated,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Use fresh user data if available, otherwise fall back to cached user
  const currentUser = freshHeaderData || user;


  // Handle mobile drawer state
  const handleMobileMenuToggle = () => {
    setProfileDrawerOpen(!mobileMenuOpen);
    onMobileMenuToggle?.();
  };

  const handleDrawerChange = (open: boolean) => {
    setProfileDrawerOpen(open);
    if (!open && mobileMenuOpen) {
      onMobileMenuClose?.();
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Check if we're on a show page
  const isShowPage = location.startsWith('/show/');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch autocomplete results
  const { data: searchResults } = useQuery({
    queryKey: ['/api/products/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { results: { products: [], rooms: [], users: [] } };
      }
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const products = searchResults?.results?.products || [];
  const shows = searchResults?.results?.rooms || [];
  const users = searchResults?.results?.users || [];

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowAutocomplete(value.length > 0);
  };

  const handleResultClick = (url: string) => {
    console.log('🔍 Autocomplete click:', url);
    setSearchQuery('');
    setShowAutocomplete(false);
    setLocation(url);
  };

  // Helper function to get user display name
  const getUserDisplayName = (user: any): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    if (user.username) {
      return user.username;
    }
    if (user.name) {
      return user.name;
    }
    if (user.displayName) {
      return user.displayName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <>
      <header className={`sticky top-0 z-50 border-b ${isShowPage ? 'bg-black border-zinc-800' : 'bg-background border-border'}`}>
        <div className="flex justify-center w-full">
          <div className="flex items-center justify-between h-14 px-3 sm:px-6 w-full lg:w-[90%]">
          {/* Left Section */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button - Only show when authenticated */}
            {isAuthenticated && (
              <Button 
                size="icon" 
                variant="ghost" 
                className={`lg:hidden h-9 w-9 rounded-full ${isShowPage ? 'text-white hover:text-white' : ''}`}
                onClick={handleMobileMenuToggle}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            {/* Logo - Hidden when sidebar is present */}
            {!hideLogo && (
              <Link href="/" data-testid="link-home">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs sm:text-sm">
                      {settings.app_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={`text-base sm:text-lg font-bold hidden sm:inline ${isShowPage ? 'text-white' : 'text-foreground'}`}>{settings.app_name}</span>
                </div>
              </Link>
            )}

            {/* Navigation - Hidden on small screens */}
            {!hideNavigation && (
              <div className="hidden md:flex items-center gap-2 ml-4">
                <Link href="/">
                  <Button 
                    className={
                      location === '/' 
                        ? "bg-primary text-primary-foreground font-semibold px-5 rounded-full h-9 text-sm" 
                        : `font-medium text-sm h-9 px-4 ${isShowPage ? 'text-white hover:text-white' : ''}`
                    }
                    variant={location === '/' ? undefined : 'ghost'}
                    data-testid="button-home"
                  >
                    Home
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button 
                    className={
                      location === '/browse' 
                        ? "bg-primary text-primary-foreground font-semibold px-5 rounded-full h-9 text-sm" 
                        : `font-medium text-sm h-9 px-4 ${isShowPage ? 'text-white hover:text-white' : ''}`
                    }
                    variant={location === '/browse' ? undefined : 'ghost'}
                    data-testid="button-browse"
                  >
                    Browse
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Search - Hidden on mobile, smaller on tablet */}
            {!hideNavigation && (
              <div ref={searchRef} className="relative hidden sm:block w-48 md:w-64 lg:w-96 ml-2">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isShowPage ? 'text-zinc-400' : 'text-muted-foreground'} pointer-events-none z-10`} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.length > 0 && setShowAutocomplete(true)}
                placeholder={`Search ${settings.app_name}`}
                className={`pl-10 text-sm h-9 rounded-md ${isShowPage ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-muted/50 border-border'}`}
                data-testid="input-search"
              />
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && (products.length > 0 || shows.length > 0 || users.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
                  {/* Current Query */}
                  <div className="px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Search className="h-4 w-4" />
                      <span>{searchQuery}</span>
                    </div>
                  </div>

                  {/* Users */}
                  {users.length > 0 && (
                    <div>
                      {users.slice(0, 3).map((user: any) => {
                        const displayName = getUserDisplayName(user);
                        return (
                          <div
                            key={user._id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleResultClick(`/profile/${user._id}`);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                            data-testid={`autocomplete-user-${user._id}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profilePhoto} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {displayName[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {displayName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Shows */}
                  {shows.length > 0 && (
                    <div>
                      {shows.slice(0, 3).map((show: any) => (
                        <div
                          key={show._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleResultClick(`/show/${show._id}`);
                          }}
                          className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                          data-testid={`autocomplete-show-${show._id}`}
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{show.title}</p>
                            <p className="text-xs text-muted-foreground">in Shows</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Products */}
                  {products.length > 0 && (
                    <div>
                      {products.slice(0, 3).map((product: any) => (
                        <div
                          key={product._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleResultClick(`/product/${product._id}`);
                          }}
                          className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                          data-testid={`autocomplete-product-${product._id}`}
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">in Products</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Show different actions based on auth state */}
            {isAuthenticated ? (
              <>
                {/* Seller Actions - Plus button with dropdown menu */}
                {currentUser?.seller && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="default" 
                        className={`h-9 w-9 rounded-full ${isShowPage ? 'bg-white text-black hover:bg-white/90' : ''}`}
                        data-testid="button-seller-actions"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/inventory/add" className="flex items-center gap-2 cursor-pointer">
                          <PackagePlus className="h-4 w-4" />
                          <span>Add Listing</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/schedule-show" className="flex items-center gap-2 cursor-pointer">
                          <Calendar className="h-4 w-4" />
                          <span>Schedule a Show</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Seller Setup - Show for non-sellers */}
                {!currentUser?.seller && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`hidden md:flex w-full rounded-full text-sm h-9 px-4 font-medium ${isShowPage ? 'border-white text-white bg-transparent hover:bg-white/10 hover:text-white' : 'border-border'}`} 
                    data-testid="button-seller-setup"
                    onClick={async () => {
                      const userId = (user as any)?._id || user?.id;
                      if (!userId) return;
                      
                      try {
                        // Fetch fresh user data to check current seller status
                        const response = await fetch(`/api/profile/${userId}`, {
                          credentials: 'include',
                        });
                        
                        if (response.ok) {
                          const userData = await response.json();
                          console.log('Fetched user data for seller check:', { seller: userData.seller, applied_seller: userData.applied_seller });
                          
                          // Check if user is already a seller
                          if (userData.seller) {
                            console.log('User is a seller - updating local data and navigating to /seller/hub');
                            // User is already a seller - update local auth context immediately
                            // so the header buttons change from "Complete Seller Setup" to "Add Listing" + "Schedule a Show"
                            await refreshUserData();
                            // Then redirect to seller hub
                            setLocation('/seller/hub');
                            return;
                          }
                          
                          console.log('User is not a seller - navigating to /seller/setup');
                          // User is not a seller - navigate to /seller/setup
                          // The /seller/setup page (client/src/pages/seller/setup.tsx) 
                          // conditionally renders based on applied_seller status:
                          // - If applied_seller === true: shows "Application Under Review" page
                          // - If applied_seller === false: shows setup form
                          setLocation('/seller/setup');
                        } else {
                          console.error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
                          toast({
                            title: "Could not verify status",
                            description: "Proceeding to seller setup page",
                            variant: "default",
                          });
                          setLocation('/seller/setup');
                        }
                      } catch (error) {
                        console.error('Error fetching user data:', error);
                        toast({
                          title: "Connection error",
                          description: "Could not verify seller status. Please try again.",
                          variant: "destructive",
                        });
                        // Still navigate to setup page as fallback
                        setLocation('/seller/setup');
                      }
                    }}
                  >
                    {(currentUser as any)?.applied_seller ? 'Complete Seller Setup' : 'Become a Seller'}
                  </Button>
                )}

                {/* Messages */}
                <Link href="/inbox">
                  <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-full hidden md:flex ${isShowPage ? 'text-white hover:text-white' : ''}`} data-testid="button-messages">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
                
                {/* Avatar */}
                {user && (
                  <Avatar 
                    className="h-9 w-9 cursor-pointer" 
                    data-testid="avatar-user-profile"
                    onClick={() => setProfileDrawerOpen(true)}
                  >
                    <AvatarImage src={user.profilePhoto} alt={`${user.firstName || user.email}`} />
                    <AvatarFallback className="bg-teal-500 text-white text-sm font-bold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </>
            ) : (
              <>
                {/* Non-authenticated actions - Show Login/Signup buttons */}
                <Link href="/login">
                  <Button variant="ghost" size="sm" className={`h-9 px-3 sm:px-4 font-medium text-sm ${isShowPage ? 'text-white hover:text-white' : ''}`} data-testid="button-login">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary text-black font-semibold rounded-full h-9 px-4 sm:px-6 text-sm" data-testid="button-signup">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
          </div>
        </div>
        
        {/* Mobile Search Bar - Show below header on mobile */}
        <div className="flex justify-center w-full">
          <div className="sm:hidden px-3 pb-2 w-full lg:w-[90%]">
            <div ref={searchRef} className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isShowPage ? 'text-zinc-400' : 'text-muted-foreground'} pointer-events-none z-10`} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.length > 0 && setShowAutocomplete(true)}
                placeholder={`Search ${settings.app_name}`}
                className={`pl-10 text-sm h-9 rounded-md ${isShowPage ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-muted/50 border-border'}`}
                data-testid="input-search-mobile"
              />
              
              {/* Mobile Autocomplete Dropdown */}
              {showAutocomplete && (products.length > 0 || shows.length > 0 || users.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
                  {/* Current Query */}
                  <div className="px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Search className="h-4 w-4" />
                      <span>{searchQuery}</span>
                    </div>
                  </div>

                  {/* Users */}
                  {users.length > 0 && (
                    <div>
                      {users.slice(0, 3).map((user: any) => {
                        const displayName = getUserDisplayName(user);
                        return (
                          <div
                            key={user._id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleResultClick(`/profile/${user._id}`);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profilePhoto} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {displayName[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {displayName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Shows */}
                  {shows.length > 0 && (
                    <div>
                      {shows.slice(0, 3).map((show: any) => (
                        <div
                          key={show._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleResultClick(`/show/${show._id}`);
                          }}
                          className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{show.title}</p>
                            <p className="text-xs text-muted-foreground">in Shows</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Products */}
                  {products.length > 0 && (
                    <div>
                      {products.slice(0, 3).map((product: any) => (
                        <div
                          key={product._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleResultClick(`/product/${product._id}`);
                          }}
                          className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">in Products</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Drawer - Only show when authenticated */}
      {isAuthenticated && (
        <ProfileDrawer open={profileDrawerOpen || mobileMenuOpen} onOpenChange={handleDrawerChange} />
      )}
    </>
  );
}
