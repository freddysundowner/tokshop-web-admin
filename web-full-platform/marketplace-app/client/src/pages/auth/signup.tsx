import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Apple, Chrome, User, Globe, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Link, useLocation } from "wouter";
import type { SignupData } from "@shared/schema";
import { signupSchema } from "@shared/schema";

// Popular countries list
const COUNTRIES = [
  "United States",
  "Canada", 
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Belgium",
  "Switzerland",
  "Austria",
  "Japan",
  "South Korea",
  "Singapore",
  "New Zealand",
  "Ireland",
  "Portugal",
  "Poland",
  "Czech Republic",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "Colombia",
  "India",
  "Other"
].sort();

export default function Signup() {
  const { settings } = useSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupError, setSignupError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { emailSignup, loginWithGoogle, loginWithApple } = useAuth();
  const [, setLocation] = useLocation();

  // Extended schema with password confirmation
  const extendedSignupSchema = signupSchema.extend({
    confirmPassword: signupSchema.shape.password,
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  type ExtendedSignupData = SignupData & { confirmPassword: string };

  const form = useForm<ExtendedSignupData>({
    resolver: zodResolver(extendedSignupSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      userName: "",
      phone: "",
      country: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      setSignupError("");
      await loginWithGoogle();
      // Success handled in auth context - no premature toast
    } catch (error: any) {
      let errorMessage = 'Google signup failed';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized for Firebase authentication. Please contact support.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSignupError(errorMessage);
      toast({ 
        title: "Signup failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    try {
      setIsLoading(true);
      setSignupError("");
      await loginWithApple();
      // Success handled in auth context - no premature toast
    } catch (error: any) {
      let errorMessage = 'Apple signup failed';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized for Firebase authentication. Please contact support.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSignupError(errorMessage);
      toast({ 
        title: "Signup failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    if (provider === 'Google') {
      handleGoogleSignup();
    } else if (provider === 'Apple') {
      handleAppleSignup();
    } else {
      toast({ 
        title: "Coming Soon", 
        description: `${provider} signup will be available soon!`,
        variant: "default" 
      });
    }
  };

  const onSubmit = async (data: ExtendedSignupData) => {
    try {
      setIsLoading(true);
      setSignupError("");
      await emailSignup(data.email, data.password, data.firstName, data.lastName, data.userName, data.phone || "", data.country);
      toast({ title: "Account created successfully!" });
      // Redirect to marketplace home after successful signup
      setLocation("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setSignupError(errorMessage);
      toast({ 
        title: "Signup failed", 
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
      
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 md:px-8">
        {/* App Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mr-3">
              <span className="text-black text-xl font-bold">{settings.app_name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-2xl font-bold text-white">{settings.app_name}</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">
              <span className="text-primary">Join the {settings.app_name}</span>
              <br />
              <span className="text-accent">Community Today</span>
            </h1>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Social Signup Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full !bg-white hover:!bg-gray-50 !text-gray-900 !border-gray-300 dark:!bg-white dark:hover:!bg-gray-100 dark:!text-gray-900"
                onClick={() => handleSocialSignup('Google')}
                data-testid="button-google-signup"
              >
                <Chrome className="h-4 w-4 mr-2 !text-gray-900" />
                Continue with Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full bg-black hover:bg-gray-900 text-white border-gray-800"
                onClick={() => handleSocialSignup('Apple')}
                data-testid="button-apple-signup"
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
            {signupError && (
              <Alert variant="destructive" className="mb-4" data-testid="alert-signup-error">
                <AlertDescription>{signupError}</AlertDescription>
              </Alert>
            )}

            {/* Email/Password Signup Form */}
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
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="First Name"
                            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                            data-testid="input-firstname"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Last Name"
                            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                            data-testid="input-lastname"
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
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Username"
                            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                            data-testid="input-username"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                            data-testid="input-phone"
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
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-country">
                          <SelectTrigger className="bg-input border-border text-foreground">
                            <div className="flex items-center">
                              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                              <SelectValue placeholder="Select your country" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                            data-testid="input-confirm-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? (
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
                  data-testid="button-signup"
                >
                  {isLoading ? "Creating account..." : 'Create Account'}
                </Button>
              </form>
            </Form>

            <div className="text-center pt-2">
              <p className="text-muted-foreground text-sm">
                Already have an account?{" "}
                <Link href="/login">
                  <button
                    className="text-primary hover:text-primary/80 font-medium"
                    data-testid="link-login"
                  >
                    Sign in
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