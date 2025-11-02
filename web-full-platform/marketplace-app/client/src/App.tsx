import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";
import { SocketProvider } from "@/lib/socket-context";
import { SocialAuthCompleteForm } from "@/components/auth/social-auth-complete-form";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/commerce/orders";
import Purchases from "@/pages/commerce/purchases";
import ThankYou from "@/pages/commerce/thank-you";
import Inventory from "@/pages/seller/inventory";
import AddProduct from "@/pages/seller/add-product";
import EditProduct from "@/pages/seller/edit-product";
import Shipping from "@/pages/seller/shipping";
import ShippingProfiles from "@/pages/seller/shipping-profiles";
import Addresses from "@/pages/addresses";
import Analytics from "@/pages/seller/analytics";
import LiveShows from "@/pages/seller/live-shows";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import ProfileView from "@/pages/marketplace/profile-view";
import ProductDetail from "@/pages/marketplace/product-detail";
import Account from "@/pages/account";
import Payments from "@/pages/payments";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";
import Transactions from "@/pages/commerce/transactions";
import MarketplaceHome from "@/pages/marketplace/home";
import Browse from "@/pages/marketplace/browse";
import Category from "@/pages/marketplace/category";
import SearchResults from "@/pages/marketplace/search-results";
import LandingPage from "@/pages/marketplace/landing-page";
import SellerLogin from "@/pages/auth/seller-login";
import ShowView from "@/pages/marketplace/show-view";
import PrivacyPolicy from "@/pages/marketplace/privacy-policy";
import TermsOfService from "@/pages/marketplace/terms-of-service";
import ContactUs from "@/pages/marketplace/contact";
import UserReports from "@/pages/marketplace/user-reports";
import FAQ from "@/pages/marketplace/faq";
import SellerHub from "@/pages/seller/hub";
import Inbox from "@/pages/social/inbox";
import Friends from "@/pages/social/friends";
import Help from "@/pages/help";
import SellerSetup from "@/pages/seller/setup";
import ScheduleShow from "@/pages/seller/schedule-show";
import NotFound from "@/pages/not-found";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";

// Home redirect component based on seller status
function HomeRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect based on seller status
    if (user?.seller) {
      setLocation('/orders');
    } else {
      setLocation('/purchases');
    }
  }, [user?.seller, setLocation]);

  return null;
}

// Login redirect
function LoginRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/');
  }, [setLocation]);

  return null;
}

function Router() {
  const { isAuthenticated, isLoading, user, pendingSocialAuth, pendingSocialAuthEmail, pendingSocialAuthData, completeSocialAuth } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [justCompletedSocialAuth, setJustCompletedSocialAuth] = useState(false);
  
  // Set default page title from settings
  usePageTitle();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Handle social auth completion
  const handleSocialAuthComplete = async (data: any) => {
    try {
      await completeSocialAuth(data);
      setJustCompletedSocialAuth(true);
    } catch (error) {
      console.error('Social auth completion failed:', error);
      // Error handling is done in the component via toast
    }
  };

  // Redirect after social auth completion
  useEffect(() => {
    if (justCompletedSocialAuth && isAuthenticated && !pendingSocialAuth && user) {
      setLocation('/marketplace');
      setJustCompletedSocialAuth(false);
    }
  }, [justCompletedSocialAuth, isAuthenticated, pendingSocialAuth, user, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show social auth completion form if pending
  if (pendingSocialAuth && pendingSocialAuthEmail && pendingSocialAuthData) {
    return (
      <SocialAuthCompleteForm
        userEmail={pendingSocialAuthEmail}
        socialAuthData={pendingSocialAuthData}
        onComplete={handleSocialAuthComplete}
        isLoading={isLoading}
      />
    );
  }

  // Show public marketplace pages if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <AppHeader hideLogo={false} hideNavigation={true} />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/marketplace" component={MarketplaceHome} />
            <Route path="/browse" component={Browse} />
            <Route path="/category/:id" component={Category} />
            <Route path="/search" component={SearchResults} />
            <Route path="/show/:id" component={ShowView} />
            <Route path="/product/:productId" component={ProductDetail} />
            <Route path="/user" component={ProfileView} />
            <Route path="/profile/:userId" component={ProfileView} />
            <Route path="/seller/login" component={SellerLogin} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-service" component={TermsOfService} />
            <Route path="/contact" component={ContactUs} />
            <Route path="/reports" component={UserReports} />
            <Route path="/faq" component={FAQ} />
            {/* Fallback to landing page */}
            <Route component={LandingPage} />
          </Switch>
        </main>
      </div>
    );
  }

  // Show main app for authenticated users
  // Marketplace pages (no sidebar) vs Dashboard pages (with sidebar)
  const isDashboardRoute = location.startsWith('/orders') || 
                          location.startsWith('/purchases') || 
                          location.startsWith('/thank-you') ||
                          location.startsWith('/inventory') || 
                          location.startsWith('/shipping') || 
                          location.startsWith('/addresses') || 
                          location.startsWith('/transactions') || 
                          location.startsWith('/profile-view') ||
                          location === '/profile' ||
                          location.startsWith('/account') ||
                          location.startsWith('/payments') ||
                          location.startsWith('/seller/hub') ||
                          location.startsWith('/friends') ||
                          location === '/settings' ||
                          location.startsWith('/analytics') ||
                          location.startsWith('/dashboard') ||
                          location.startsWith('/live-shows') ||
                          location.startsWith('/schedule-show');

  // Dashboard pages with sidebar
  if (isDashboardRoute) {
    return (
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={toggleSidebar} 
            isMobileOpen={false}
            onMobileClose={closeMobileMenu}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader 
            onMobileMenuToggle={toggleMobileMenu}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuClose={closeMobileMenu}
            hideLogo={true}
          />
          <main className="flex-1 overflow-y-auto focus:outline-none">
            <Switch>
              <Route path="/seller/hub" component={SellerHub} />
              <Route path="/orders" component={Orders} />
              <Route path="/purchases" component={Purchases} />
              <Route path="/thank-you/:orderId" component={ThankYou} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/inventory/add" component={AddProduct} />
              <Route path="/inventory/edit/:id" component={EditProduct} />
              <Route path="/shipping" component={Shipping} />
              <Route path="/shipping-profiles" component={ShippingProfiles} />
              <Route path="/addresses" component={Addresses} />
              <Route path="/transactions" component={Transactions} />
              <Route path="/profile-view" component={ProfileView} />
              <Route path="/profile" component={Profile} />
              <Route path="/account" component={Account} />
              <Route path="/payments" component={Payments} />
              <Route path="/settings" component={Settings} />
              <Route path="/friends" component={Friends} />
              <Route path="/live-shows" component={LiveShows} />
              <Route path="/schedule-show" component={ScheduleShow} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    );
  }

  // Marketplace pages without sidebar but with unified header
  const isShowViewPage = location.startsWith('/show/');
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className={cn(isShowViewPage && "hidden lg:block")}>
        <AppHeader hideLogo={false} />
      </div>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Switch>
          <Route path="/" component={MarketplaceHome} />
          <Route path="/marketplace" component={MarketplaceHome} />
          <Route path="/browse" component={Browse} />
          <Route path="/category/:id" component={Category} />
          <Route path="/search" component={SearchResults} />
          <Route path="/show/:id" component={ShowView} />
          <Route path="/product/:productId" component={ProductDetail} />
          <Route path="/user" component={ProfileView} />
          <Route path="/profile/:userId" component={ProfileView} />
          <Route path="/inbox/:userId?" component={Inbox} />
          <Route path="/seller/setup" component={SellerSetup} />
          <Route path="/login" component={MarketplaceHome} />
          <Route path="/signup" component={MarketplaceHome} />
          <Route path="/seller/login" component={MarketplaceHome} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/contact" component={ContactUs} />
          <Route path="/reports" component={UserReports} />
          <Route path="/faq" component={FAQ} />
          <Route path="/help" component={Help} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <SocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SocketProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
