import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  CreditCard,
  MapPin,
  Lock,
  AlertTriangle,
  MessageSquare,
  Store,
  Package,
  ShoppingBag,
  Box,
  Truck,
  Package2,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const userId = (user as any)?._id || user?.id;
  
  // Fetch fresh user data to check current seller status
  const { data: freshUserData } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Use fresh user data if available, otherwise fall back to cached user
  const currentUser = freshUserData || user;

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    }
    if (currentUser?.firstName) {
      return currentUser.firstName[0].toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email[0].toUpperCase();
    }
    return 'U';
  };

  const generalItems = [
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Addresses", href: "/addresses", icon: MapPin },
    // { name: "Account", href: "/account", icon: Lock },
  ];

  const sellingItems = [
    { name: "Shows", href: "/live-shows", icon: Video },
    { name: "Orders", href: "/orders", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Box },
    { name: "Shipments", href: "/shipping", icon: Truck },
    { name: "Shipping Profiles", href: "/shipping-profiles", icon: Package2 },
  ];

  const buyingItems = [
    { name: "Purchases", href: "/purchases", icon: ShoppingBag },
  ];

  const helpItems = [
    { name: "User Reports", href: "/reports", icon: AlertTriangle },
    { name: "Contact Us", href: "/contact", icon: MessageSquare },
  ];

  // Sidebar content component (reused for desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col flex-grow overflow-y-auto">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border" data-testid="logo-container">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary w-5 h-5">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-foreground">{settings.app_name}</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="hidden lg:flex flex-shrink-0"
          data-testid="button-toggle-sidebar"
        >
          <ChevronLeft size={16} />
        </Button>
      </div>

      {/* Profile Section */}
      <div className="px-4 py-6" data-testid="user-profile">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={currentUser?.profilePhoto} alt={currentUser?.userName || currentUser?.email} />
            <AvatarFallback className="bg-teal-500 text-white text-lg font-bold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">
              {currentUser?.userName || `${currentUser?.firstName} ${currentUser?.lastName}`.trim() || 'User'}
            </p>
            <Link href="/profile-view">
              <button 
                className="text-sm text-primary hover:underline" 
                data-testid="link-view-profile"
                onClick={onMobileClose}
              >
                View profile
              </button>
            </Link>
          </div>
        </div>
      </div>

      <Separator />

      {/* Buying Section */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">Buying</h2>
        <nav className="space-y-1" data-testid="nav-buying">
          {buyingItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  onClick={onMobileClose}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Selling Section (for sellers only) */}
      {currentUser?.seller && (
        <>
          <Separator />
          <div className="px-4 py-4">
            <h2 className="text-lg font-semibold text-foreground mb-3">Selling</h2>
            <nav className="space-y-1" data-testid="nav-selling">
              {sellingItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                      onClick={onMobileClose}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}

      <Separator />

      {/* General Section */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">General</h2>
        <nav className="space-y-1" data-testid="nav-general">
          {generalItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  onClick={onMobileClose}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator />

      {/* Help & Legal Section */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">Help & Legal</h2>
        <nav className="space-y-1" data-testid="nav-help">
          {helpItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  onClick={onMobileClose}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex lg:flex-col lg:w-16 transition-all duration-300 bg-background border-r border-border">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          {/* Collapsed Toggle */}
          <div className="flex items-center justify-center px-2" data-testid="logo-container">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="flex-shrink-0"
              data-testid="button-toggle-sidebar"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 transition-all duration-300 bg-background border-r border-border">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="w-64 p-0 lg:hidden">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
