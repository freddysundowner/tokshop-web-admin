import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Save, Camera, User, Mail, Phone, MapPin, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { z } from "zod";

// Profile update schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userName: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone === '') return true;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[0-9]{3}[)]?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4,6}$|^[\+]?[0-9]{8,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }, "Please enter a valid phone number"),
  country: z.string().min(1, "Country is required"),
});

type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      userName: user?.userName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      country: user?.country || "",
    },
  });

  const isSocialLogin = user?.authProvider === 'google' || user?.authProvider === 'apple';

  const onSubmit = async (data: ProfileUpdateData) => {
    try {
      setIsLoading(true);
      setUpdateError("");
      
      // Call profile update API
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update localStorage with new user data
      if (result.data) {
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          const updatedUser = {
            ...JSON.parse(currentUser),
            ...result.data,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
      
      toast({ 
        title: "Profile updated", 
        description: "Your profile has been successfully updated." 
      });
      
      setIsEditing(false);
      
      // Reload to reflect changes
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setUpdateError(errorMessage);
      toast({ 
        title: "Update failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
    setUpdateError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-[90%] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>
          {!isEditing && (
            <Button 
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-profile"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24" data-testid="avatar-profile">
                  <AvatarImage src={user?.profilePhoto} />
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                {isEditing && (
                  <Button variant="outline" size="sm" data-testid="button-upload-photo">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {updateError && (
                <Alert variant="destructive" className="mb-6" data-testid="alert-update-error">
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              )}

              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your first name"
                                data-testid="input-first-name"
                                {...field} 
                              />
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
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your last name"
                                data-testid="input-last-name"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="userName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username"
                              data-testid="input-username"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="Enter your email"
                              data-testid="input-email"
                              disabled={isSocialLogin}
                              {...field} 
                            />
                          </FormControl>
                          {isSocialLogin && (
                            <p className="text-xs text-muted-foreground">
                              Email cannot be changed for {user?.authProvider === 'google' ? 'Google' : 'Apple'} accounts
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your phone number"
                                data-testid="input-phone"
                                {...field} 
                              />
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
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your country"
                                data-testid="input-country"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isLoading}
                        data-testid="button-save"
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <p className="text-foreground" data-testid="text-first-name">
                        {user?.firstName || "Not provided"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <p className="text-foreground" data-testid="text-last-name">
                        {user?.lastName || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                    <p className="text-foreground" data-testid="text-username">
                      {user?.userName || "Not provided"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Address
                      {isSocialLogin && (
                        <span className="ml-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                          {user?.authProvider === 'google' ? 'Google' : 'Apple'} Account
                        </span>
                      )}
                    </Label>
                    <p className="text-foreground" data-testid="text-email">
                      {user?.email || "Not provided"}
                    </p>
                    {isSocialLogin && (
                      <p className="text-xs text-muted-foreground">
                        Email is managed by your {user?.authProvider === 'google' ? 'Google' : 'Apple'} account
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        Phone Number
                      </Label>
                      <p className="text-foreground" data-testid="text-phone">
                        {user?.phone || "Not provided"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Country
                      </Label>
                      <p className="text-foreground" data-testid="text-country">
                        {user?.country || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}