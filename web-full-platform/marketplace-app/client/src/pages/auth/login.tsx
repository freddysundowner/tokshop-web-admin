import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Apple, Chrome, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import type { LoginData } from "@shared/schema";
import { loginSchema } from "@shared/schema";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { emailLogin, loginWithGoogle, loginWithApple, isLoading: authLoading } = useAuth();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setLoginError("");
      await loginWithGoogle();
      // Success handled in auth context - no premature toast
    } catch (error: any) {
      let errorMessage = 'Google login failed';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized for Firebase authentication. Please contact support.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLoginError(errorMessage);
      toast({ 
        title: "Login failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      setLoginError("");
      await loginWithApple();
      // Success handled in auth context - no premature toast
    } catch (error: any) {
      let errorMessage = 'Apple login failed';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized for Firebase authentication. Please contact support.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLoginError(errorMessage);
      toast({ 
        title: "Login failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (provider === 'Google') {
      handleGoogleLogin();
    } else if (provider === 'Apple') {
      handleAppleLogin();
    } else {
      toast({ 
        title: "Coming Soon", 
        description: `${provider} login will be available soon!`,
        variant: "default" 
      });
    }
  };

  const onSubmit = async (data: LoginData) => {
    try {
      setIsLoading(true);
      setLoginError("");
      await emailLogin(data.email, data.password);
      toast({ title: "Login successful!" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLoginError(errorMessage);
      toast({ 
        title: "Login failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-lg px-4 sm:px-6 md:px-8">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">
              <span className="text-primary">Shop Live.</span>
              <br />
              <span className="text-accent">Stream. Sell. Connect.</span>
            </h1>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm relative">
          {/* Loading Overlay */}
          {(authLoading || isLoading) && (
            <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg" data-testid="loading-overlay">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">Signing you in...</p>
                <p className="text-sm text-muted-foreground">Please wait while we authenticate your account</p>
              </div>
            </div>
          )}
          
          <CardHeader className="pb-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Sign in to continue</h2>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full !bg-white hover:!bg-gray-50 !text-gray-900 !border-gray-300 dark:!bg-white dark:hover:!bg-gray-100 dark:!text-gray-900"
                onClick={() => handleSocialLogin('Google')}
                data-testid="button-google-login"
              >
                <Chrome className="h-4 w-4 mr-2 !text-gray-900" />
                Continue with Google
              </Button>
              
              
              <Button
                type="button"
                variant="outline"
                className="w-full bg-black hover:bg-gray-900 text-white border-gray-800"
                onClick={() => handleSocialLogin('Apple')}
                data-testid="button-apple-login"
              >
                <Apple className="h-4 w-4 mr-2" />
                Continue with Apple
              </Button>
            </div>

            <div className="relative">
              <Separator className="my-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-3 bg-card text-muted-foreground text-sm">or</span>
              </div>
            </div>

            {/* Error Alert */}
            {loginError && (
              <Alert variant="destructive" className="mb-4" data-testid="alert-login-error">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            {/* Email/Password Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="Email Address"
                            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                            data-testid="input-email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium py-3 rounded-lg transition-all duration-200"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Please wait..." : 'Log in'}
                </Button>
              </form>
            </Form>

            <div className="text-center pt-2 space-y-2">
              <button
                onClick={() => {
                  toast({ 
                    title: "Coming Soon", 
                    description: "Password reset will be available soon!",
                    variant: "default" 
                  });
                }}
                className="text-primary hover:text-primary/80 text-sm font-medium"
                data-testid="link-forgot-password"
              >
                Forgot Password?
              </button>
              
              <p className="text-muted-foreground text-sm">
                Don't have an account?{" "}
                <Link href="/signup">
                  <button
                    className="text-primary hover:text-primary/80 font-medium"
                    data-testid="link-signup"
                  >
                    Sign up
                  </button>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>Need help? Contact our support team</p>
        </div>
      </div>
    </div>
  );
}