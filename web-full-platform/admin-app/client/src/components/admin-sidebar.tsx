import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Banknote,
  Video,
  Settings,
  ShieldCheck,
  UserCircle,
  Coins,
  FolderOpen,
  AlertTriangle,
  Flag,
  X,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
  {
    section: "User Management",
    items: [
      {
        name: "Users",
        href: "/admin/users",
        icon: Users,
      },
      {
        name: "Reported Cases",
        href: "/admin/reported-cases",
        icon: Flag,
      },
    ],
  },
  {
    section: "Commerce",
    items: [
      {
        name: "Inventory",
        href: "/admin/inventory",
        icon: Package,
      },
      {
        name: "Orders",
        href: "/admin/orders",
        icon: ShoppingCart,
      },
      {
        name: "Disputes",
        href: "/admin/disputes",
        icon: AlertTriangle,
      },
      {
        name: "Transactions",
        href: "/admin/transactions",
        icon: CreditCard,
      },
      {
        name: "Payouts",
        href: "/admin/payouts",
        icon: Banknote,
      },
    ],
  },
  {
    section: "Platform",
    items: [
      {
        name: "Revenue",
        href: "/admin/application-fees",
        icon: Coins,
      },
      {
        name: "Categories",
        href: "/admin/categories",
        icon: FolderOpen,
      },
      {
        name: "Shows",
        href: "/admin/shows",
        icon: Video,
      },
      {
        name: "Emails",
        href: "/admin/emails",
        icon: Mail,
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        name: "Profile",
        href: "/admin/profile",
        icon: UserCircle,
      },
      {
        name: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [location] = useLocation();

  // Fetch settings to get the app name
  const { data: settingsData } = useQuery<any>({
    queryKey: ['/api/admin/settings'],
  });

  const settings = settingsData?.data || settingsData;
  const appName = settings?.app_name || 'Admin Panel';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "flex flex-col w-64 bg-card border-r border-border h-full transition-transform duration-300 ease-in-out",
        "lg:relative lg:translate-x-0",
        "fixed inset-y-0 left-0 z-50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navigationItems.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.section}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                        )}
                        onClick={onClose}
                        data-testid={`link-admin-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
