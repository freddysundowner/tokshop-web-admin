import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Globe } from "lucide-react";

interface MarketplaceSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories?: Array<{
    _id: string;
    name: string;
    image?: string;
  }>;
}

export function MarketplaceSidebar({ selectedCategory, onCategoryChange, categories = [] }: MarketplaceSidebarProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const userName = user?.userName || user?.firstName || 'User';
  const currentYear = new Date().getFullYear();

  return (
    <aside 
      className="hidden lg:flex lg:flex-col w-64 bg-background border-r border-border/40 h-full flex-shrink-0" 
      data-testid="sidebar-marketplace"
    >
      {/* User Greeting */}
      <div className="px-4 pt-8 pb-6">
        <h2 className="text-[28px] leading-tight font-bold text-foreground" data-testid="text-greeting">
          Hello {userName}!
        </h2>
      </div>
      
      {/* Scrollable Categories Section */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* For You */}
        <button
          onClick={() => onCategoryChange('For You')}
          className={cn(
            "text-left py-2.5 text-base transition-colors w-full",
            selectedCategory === 'For You'
              ? "text-primary font-normal"
              : "text-muted-foreground font-normal"
          )}
          data-testid="category-for-you"
        >
          For You
        </button>

        {/* Categories */}
        {categories.map((category) => (
          <button
            key={category._id}
            onClick={() => onCategoryChange(category.name)}
            className={cn(
              "text-left py-2.5 text-base transition-colors w-full",
              selectedCategory === category.name
                ? "text-primary font-normal"
                : "text-muted-foreground font-normal"
            )}
            data-testid={`category-${category._id}`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Footer Links */}
      <div className="px-4 pb-8 space-y-2">
        <div className="flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
          <Link href="/privacy-policy" data-testid="link-privacy"><span className="cursor-pointer">Privacy</span></Link>
          <Link href="/terms-of-service" data-testid="link-terms"><span className="cursor-pointer">Terms</span></Link>
          <Link href="/contact" data-testid="link-contact"><span className="cursor-pointer">Contact</span></Link>
          <Link href="/faq" data-testid="link-faq"><span className="cursor-pointer">FAQ</span></Link>
        </div>
        
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground pt-2">
          <Globe className="w-4 h-4" />
          <span data-testid="text-language">British English</span>
        </div>
        
        <div className="text-[13px] text-muted-foreground pt-1">
          © {currentYear} {settings.app_name} Inc.
        </div>
      </div>
    </aside>
  );
}
