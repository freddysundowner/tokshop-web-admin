import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";
import { SocialAuthCompleteForm } from "@/components/auth/social-auth-complete-form";
import AdminLogin from "@/pages/admin/login";
import AdminSetup from "@/pages/admin/setup";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminUserDetail from "@/pages/admin/user-detail";
import AdminUserItemDetail from "@/pages/admin/user-item-detail";
import AdminInventory from "@/pages/admin/inventory";
import AdminProductDetail from "@/pages/admin/product-detail";
import AdminOrders from "@/pages/admin/orders";
import AdminOrderDetail from "@/pages/admin/order-detail";
import AdminTransactions from "@/pages/admin/transactions";
import AdminPayouts from "@/pages/admin/payouts";
import AdminShows from "@/pages/admin/shows";
import AdminShowDetail from "@/pages/admin/show-detail";
import AdminSettings from "@/pages/admin/settings";
import AdminProfile from "@/pages/admin/profile";
import AdminApplicationFees from "@/pages/admin/application-fees";
import AdminCategories from "@/pages/admin/categories";
import AdminSubCategories from "@/pages/admin/subcategories";
import AdminDisputes from "@/pages/admin/disputes";
import AdminDisputeDetail from "@/pages/admin/dispute-detail";
import AdminReportedCases from "@/pages/admin/reported-cases";
import AdminEmails from "@/pages/admin/emails";
import NotFound from "@/pages/not-found";
import { usePageTitle } from "@/hooks/use-page-title";


function InitialSetupCheck({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    // Don't check if we're already on the setup page to avoid redirect loop
    if (location === '/admin/setup') {
      setCheckingAdmin(false);
      setAdminExists(true); // Pretend admin exists so setup page can load
      return;
    }

    const checkAdminExists = async () => {
      try {
        const response = await fetch('/api/admin/exists', {
          credentials: 'include',
        });
        
        const result = await response.json();
        
        if (result.success) {
          setAdminExists(result.exists);
        }
      } catch (error) {
        console.error("Error checking if admin exists:", error);
        // On error, assume admin exists to avoid redirect loop
        setAdminExists(true);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminExists();
  }, [location]);

  // Show loading while checking
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking admin setup...</p>
        </div>
      </div>
    );
  }

  // If no admin exists and not on setup page, redirect to setup
  if (!adminExists && location !== '/admin/setup') {
    window.location.href = "/admin/setup";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // Admin exists or on setup page, show normal app
  return <>{children}</>;
}

function Router() {
  const { isAuthenticated, isLoading, user, pendingSocialAuth, pendingSocialAuthEmail, pendingSocialAuthData, completeSocialAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [justCompletedSocialAuth, setJustCompletedSocialAuth] = useState(false);
  
  // Set default page title from settings
  usePageTitle();

  // Handle social auth completion
  const handleSocialAuthComplete = async (data: any) => {
    try {
      await completeSocialAuth(data);
      setJustCompletedSocialAuth(true);
    } catch (error) {
      console.error('Social auth completion failed:', error);
    }
  };

  // Redirect after social auth completion
  useEffect(() => {
    if (justCompletedSocialAuth && isAuthenticated && !pendingSocialAuth && user) {
      if (user.admin) {
        setLocation('/admin');
      } else {
        // Non-admin users cannot access admin app
        setLocation('/admin/login');
      }
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

  // Show admin login or setup if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/admin/setup" component={AdminSetup} />
            <Route path="/admin/login" component={AdminLogin} />
            {/* Redirect all other paths to admin login */}
            <Route component={AdminLogin} />
          </Switch>
        </main>
      </div>
    );
  }

  // Show admin pages if user is admin
  if (user?.admin) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users/:userId/details/:itemType/:itemId" component={AdminUserItemDetail} />
            <Route path="/admin/users/:userId" component={AdminUserDetail} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/inventory" component={AdminInventory} />
            <Route path="/admin/products/:productId" component={AdminProductDetail} />
            <Route path="/admin/orders/:orderId" component={AdminOrderDetail} />
            <Route path="/admin/orders" component={AdminOrders} />
            <Route path="/admin/disputes/:disputeId" component={AdminDisputeDetail} />
            <Route path="/admin/disputes" component={AdminDisputes} />
            <Route path="/admin/reported-cases" component={AdminReportedCases} />
            <Route path="/admin/transactions" component={AdminTransactions} />
            <Route path="/admin/payouts" component={AdminPayouts} />
            <Route path="/admin/application-fees" component={AdminApplicationFees} />
            <Route path="/admin/categories/:categoryId/subcategories" component={AdminSubCategories} />
            <Route path="/admin/categories" component={AdminCategories} />
            <Route path="/admin/shows/:showId" component={AdminShowDetail} />
            <Route path="/admin/shows" component={AdminShows} />
            <Route path="/admin/emails" component={AdminEmails} />
            <Route path="/admin/settings" component={AdminSettings} />
            <Route path="/admin/profile" component={AdminProfile} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    );
  }

  // Non-admin users cannot access this app - redirect to login
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <AdminLogin />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <InitialSetupCheck>
              <Router />
            </InitialSetupCheck>
          </TooltipProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
