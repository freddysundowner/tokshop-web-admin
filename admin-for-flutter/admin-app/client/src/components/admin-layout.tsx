import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useLocation, Link } from "wouter";
import { LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
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
    return 'A';
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Header - Full Width */}
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 flex justify-between items-center h-14 z-10">
        {/* Left Section - Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden h-9 w-9 p-0"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link href="/admin" data-testid="link-admin-home">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {settings.app_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-bold text-foreground leading-tight">{settings.app_name}</span>
                <span className="text-xs text-muted-foreground -mt-0.5">Admin Panel</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Section - User Info + Avatar Dropdown */}
        <div className="flex items-center gap-2">
          {/* User Email & Badge (hidden on mobile) */}
          <div className="text-right hidden md:block mr-2">
            <p className="text-sm font-medium text-foreground" data-testid="text-admin-email">{user?.email}</p>
            <Badge variant="secondary" className="mt-0.5 text-xs">Admin</Badge>
          </div>

          {/* Admin Avatar with Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="button-profile-dropdown">
                <Avatar className="h-9 w-9 cursor-pointer hover-elevate">
                  <AvatarImage src={user.profilePhoto} alt={`${user.firstName || user.email}`} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="cursor-pointer" data-testid="dropdown-profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer" data-testid="dropdown-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="dropdown-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
