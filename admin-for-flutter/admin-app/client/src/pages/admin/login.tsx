import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Mail, Loader2, Lock } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, checkAuth, logout } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Redirect if already logged in as admin (in useEffect to avoid render-phase side effects)
  useEffect(() => {
    if (user?.admin) {
      setLocation("/admin");
    }
  }, [user?.admin, setLocation]);

  // Handle logout for normal users
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You can now login as an admin",
      });
      // Refresh the page to show the login form
      await checkAuth();
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show message if user is logged in as normal user (not admin)
  if (user && !user.admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md px-4 sm:px-6 md:px-8">
          {/* Admin Badge */}
          <div className="text-center mb-8">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" data-testid="icon-admin-shield" />
                <h1 className="text-3xl sm:text-4xl font-bold text-primary">Admin Portal</h1>
              </div>
            </div>
          </div>

          {/* Message Card */}
          <Card className="shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="text-center mb-4">
                <CardTitle className="text-xl font-semibold text-foreground">Already Logged In</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">
                  You are currently logged in as <span className="font-medium text-foreground">{user.email}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  To access the admin portal, please logout from your current account first.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleLogout}
                  className="w-full"
                  disabled={isLoggingOut}
                  data-testid="button-logout-to-admin"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    "Logout to Continue"
                  )}
                </Button>

                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="w-full"
                  disabled={isLoggingOut}
                  data-testid="button-back-dashboard"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call the admin login endpoint directly
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Admin login failed');
      }

      // Check if we have user data in the response
      if (!result.data) {
        throw new Error('Invalid response: missing user data');
      }

      // Anyone who successfully logs in through admin endpoint is automatically a super admin
      // Store user data in localStorage for persistence
      const userId = result.data._id || result.data.id;
      if (!userId) {
        throw new Error('Invalid response: missing user ID');
      }

      localStorage.setItem('userId', userId);
      localStorage.setItem('user', JSON.stringify({
        id: userId,
        email: result.data.email || email, // Fallback to input email
        firstName: result.data.firstName || '',
        lastName: result.data.lastName || '',
        profilePhoto: result.data.profilePhoto || '',
        userName: result.data.userName || result.data.email || email,
        country: result.data.country || '',
        phone: result.data.phone || '',
        seller: result.data.seller || false,
        admin: true, // Automatically set as admin for admin login
        authProvider: 'email' as const
      }));
      
      // Store access token in localStorage for API calls
      if (result.accessToken) {
        localStorage.setItem('adminAccessToken', result.accessToken);
      }

      // Refresh auth context to pick up the new user from localStorage
      await checkAuth();
      
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin dashboard",
      });
      
      // Navigate smoothly without page reload
      setLocation('/admin');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 md:px-8">
        {/* Admin Badge */}
        <div className="text-center mb-8">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" data-testid="icon-admin-shield" />
              <h1 className="text-3xl sm:text-4xl font-bold text-primary">Admin Portal</h1>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg" data-testid="loading-overlay">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">Signing you in...</p>
                <p className="text-sm text-muted-foreground">Verifying admin credentials</p>
              </div>
            </div>
          )}
          
          <CardHeader className="pb-4">
            <div className="text-center mb-4">
              <CardTitle className="text-xl font-semibold text-foreground">Admin Login</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Admin Email Address"
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-admin-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-admin-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-admin-login"
              >
                {isLoading ? "Signing in..." : "Sign In as Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
