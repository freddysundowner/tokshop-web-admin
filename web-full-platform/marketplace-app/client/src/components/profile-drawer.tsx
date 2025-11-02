import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { 
  Radio,
  Receipt,
  Package,
  Truck,
  DollarSign,
  Store,
  MessageCircle,
  Settings,
  HelpCircle,
  ChevronRight,
  ShoppingBag,
  MapPin,
  Home,
  Grid,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActionButton {
  icon: any;
  label: string;
  href: string;
  testId: string;
}

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  testId: string;
  sellerOnly?: boolean;
  onClick?: () => void;
  isDestructive?: boolean;
}

export function ProfileDrawer({ open, onOpenChange }: ProfileDrawerProps) {
  const { user, logout } = useAuth();
  
  const userId = (user as any)?._id || user?.id;
  
  // Fetch fresh user data to check current seller status
  const { data: freshUserData } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId && open,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Use fresh user data if available, otherwise fall back to cached user
  const currentUser = freshUserData || user;
  const [activeTab, setActiveTab] = useState(currentUser?.seller ? 'selling' : 'buying');

  if (!user) return null;

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    }
    if (currentUser.firstName) {
      return currentUser.firstName[0].toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (currentUser.userName) return currentUser.userName;
    if (currentUser.firstName || currentUser.lastName) {
      return `${currentUser.firstName || ''}${currentUser.lastName || ''}`.trim();
    }
    return currentUser.email?.split('@')[0] || 'User';
  };

  // Selling action buttons (only for sellers)
  const sellingActions: ActionButton[] = [
    { icon: Radio, label: 'Shows', href: '/live-shows', testId: 'action-shows' },
    { icon: Receipt, label: 'Orders', href: '/orders', testId: 'action-orders' },
    { icon: Package, label: 'Inventory', href: '/inventory', testId: 'action-inventory' },
    { icon: Truck, label: 'Shipments', href: '/shipping', testId: 'action-shipments' },
    { icon: DollarSign, label: 'Finances', href: '/payments', testId: 'action-finances' },
  ];

  // Buying action buttons
  const buyingActions: ActionButton[] = [
    { icon: ShoppingBag, label: 'Purchases', href: '/purchases', testId: 'action-purchases' },
    { icon: MapPin, label: 'Addresses', href: '/addresses', testId: 'action-addresses' },
  ];

  // Handle logout
  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
  };

  // Menu items
  const menuItems: MenuItem[] = [
    { icon: Store, label: 'Seller Hub', href: '/seller/hub', testId: 'menu-seller-hub', sellerOnly: true },
    { icon: MessageCircle, label: 'Friends', href: '/friends', testId: 'menu-friends' },
    // { icon: Settings, label: 'Account Settings', href: '/settings', testId: 'menu-settings' },
    { icon: HelpCircle, label: 'Help & Legal', href: '/help', testId: 'menu-help' },
    { icon: LogOut, label: 'Logout', testId: 'menu-logout', onClick: handleLogout, isDestructive: true },
  ];

  const handleNavigation = (href: string) => {
    onOpenChange(false);
  };

  const renderActionButton = (action: ActionButton) => (
    <Link key={action.testId} href={action.href}>
      <button
        onClick={() => handleNavigation(action.href)}
        className="flex flex-col items-center justify-center p-4 rounded-lg hover-elevate active-elevate-2 transition-all"
        data-testid={action.testId}
      >
        <action.icon className="h-6 w-6 text-foreground mb-2" />
        <span className="text-xs text-center text-foreground font-medium">{action.label}</span>
      </button>
    </Link>
  );

  const renderMenuItem = (item: MenuItem) => {
    // Hide seller-only items for non-sellers
    if (item.sellerOnly && !currentUser.seller) {
      return null;
    }

    // If item has onClick handler (like logout), render without Link
    if (item.onClick) {
      return (
        <button
          key={item.testId}
          onClick={item.onClick}
          className={cn(
            "flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all",
            item.isDestructive && "text-destructive"
          )}
          data-testid={item.testId}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn("h-5 w-5", item.isDestructive ? "text-destructive" : "text-foreground")} />
            <span className="text-base">{item.label}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      );
    }

    return (
      <Link key={item.testId} href={item.href || '#'}>
        <button
          onClick={() => handleNavigation(item.href || '#')}
          className="flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all"
          data-testid={item.testId}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5 text-foreground" />
            <span className="text-base text-foreground">{item.label}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 overflow-y-auto flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* User Profile Section */}
        <div className="p-4">
          <Link href="/profile-view">
            <button
              onClick={() => handleNavigation('/profile-view')}
              className="flex items-center gap-3 w-full hover-elevate active-elevate-2 p-2 rounded-lg transition-all"
              data-testid="button-profile-view"
            >
              <Avatar className="h-14 w-14" data-testid="drawer-avatar">
                <AvatarImage src={currentUser.profilePhoto} alt={currentUser.userName || currentUser.email} />
                <AvatarFallback className="bg-teal-500 text-white text-lg font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-foreground text-base truncate" data-testid="text-username">
                  {getUserDisplayName()}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <span><span className="font-semibold text-foreground">23</span> following</span>
                  <span>•</span>
                  <span><span className="font-semibold text-foreground">52</span> followers</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          </Link>
        </div>

        <Separator />

        {/* Mobile List View */}
        <div className="md:hidden flex-1">
          <div className="space-y-1 p-2">
            {/* Navigation Links */}
            <Link href="/marketplace">
              <button
                onClick={() => handleNavigation('/marketplace')}
                className="flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all"
                data-testid="menu-home-mobile"
              >
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-foreground" />
                  <span className="text-base text-foreground">Home</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
            
            <Link href="/browse">
              <button
                onClick={() => handleNavigation('/browse')}
                className="flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all"
                data-testid="menu-browse-mobile"
              >
                <div className="flex items-center gap-3">
                  <Grid className="h-5 w-5 text-foreground" />
                  <span className="text-base text-foreground">Browse</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>

            <Separator className="my-2" />

            {/* Selling Actions as List Items */}
            {currentUser.seller && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Selling
                </div>
                {sellingActions.map(action => (
                  <Link key={action.testId} href={action.href}>
                    <button
                      onClick={() => handleNavigation(action.href)}
                      className="flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all"
                      data-testid={action.testId}
                    >
                      <div className="flex items-center gap-3">
                        <action.icon className="h-5 w-5 text-foreground" />
                        <span className="text-base text-foreground">{action.label}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </Link>
                ))}
              </>
            )}

            {/* Buying Actions as List Items */}
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Buying
            </div>
            {buyingActions.map(action => (
              <Link key={action.testId} href={action.href}>
                <button
                  onClick={() => handleNavigation(action.href)}
                  className="flex items-center justify-between w-full py-3 px-4 hover-elevate active-elevate-2 transition-all"
                  data-testid={action.testId}
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="h-5 w-5 text-foreground" />
                    <span className="text-base text-foreground">{action.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </Link>
            ))}

            <Separator className="my-2" />

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map(item => renderMenuItem(item))}
            </div>
          </div>
        </div>

        {/* Desktop Tabs View */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:flex flex-1 flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            {currentUser.seller && (
              <TabsTrigger 
                value="selling" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 py-3 font-semibold"
                data-testid="tab-selling"
              >
                Selling
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="buying" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 py-3 font-semibold"
              data-testid="tab-buying"
            >
              Buying
            </TabsTrigger>
          </TabsList>

          {/* Selling Tab Content */}
          {currentUser.seller && (
            <TabsContent value="selling" className="flex-1 mt-0 p-4">
              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {sellingActions.map(action => renderActionButton(action))}
              </div>

              <Separator className="my-4" />

              {/* Menu Items */}
              <div className="space-y-1">
                {menuItems.map(item => renderMenuItem(item))}
              </div>
            </TabsContent>
          )}

          {/* Buying Tab Content */}
          <TabsContent value="buying" className="flex-1 mt-0 p-4">
            {/* Action Buttons Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {buyingActions.map(action => renderActionButton(action))}
            </div>

            <Separator className="my-4" />

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map(item => renderMenuItem(item))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
