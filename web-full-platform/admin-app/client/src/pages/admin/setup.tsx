import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { ShieldCheck, AlertCircle, Info, CheckCircle2, Lock, Mail, User } from "lucide-react";

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "admin",
    full_name: "Admin",
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create admin" }));
        throw new Error(error.error || error.message || "Failed to create admin");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Admin created successfully:", data);
      toast({
        title: "Admin account created!",
        description: "Verifying setup...",
      });
      
      // Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if admin exists now
      try {
        const checkResponse = await fetch('/api/admin/exists', {
          credentials: 'include',
        });
        
        const checkResult = await checkResponse.json();
        
        if (checkResult.success && checkResult.exists) {
          toast({
            title: "Setup complete!",
            description: "Redirecting to login page...",
          });
          // Smooth redirect to login page
          await new Promise(resolve => setTimeout(resolve, 800));
          setLocation("/admin/login");
        } else {
          toast({
            title: "Admin created",
            description: "Please try logging in.",
            variant: "default",
          });
          await new Promise(resolve => setTimeout(resolve, 500));
          setLocation("/admin/login");
        }
      } catch (error) {
        console.error("Error checking admin existence:", error);
        // Still redirect to login on error
        await new Promise(resolve => setTimeout(resolve, 500));
        setLocation("/admin/login");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to create admin account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing fields",
        description: "Email and password are required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    createAdminMutation.mutate({
      email: formData.email,
      password: formData.password,
      username: formData.username,
      full_name: formData.full_name,
      role: "admin",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Admin Setup</CardTitle>
            <CardDescription className="text-center max-w-md mx-auto mt-2">
              This is a one-time setup. Create your first administrator account to access the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Admin"
                      className="pl-10"
                      data-testid="input-setup-fullname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="admin"
                      className="pl-10"
                      data-testid="input-setup-username"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="pl-10"
                    required
                    data-testid="input-setup-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="pl-10"
                      required
                      minLength={6}
                      data-testid="input-setup-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      className="pl-10"
                      required
                      minLength={6}
                      data-testid="input-setup-confirm-password"
                    />
                  </div>
                </div>
              </div>

              {createAdminMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(createAdminMutation.error as any)?.message || "Failed to create admin account. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createAdminMutation.isPending}
                data-testid="button-setup-submit"
              >
                {createAdminMutation.isPending ? "Creating Account..." : "Create Admin Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
