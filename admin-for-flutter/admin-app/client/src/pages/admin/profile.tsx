import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Lock, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminProfile() {
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const { data: sessionData } = useQuery<any>({
    queryKey: ['/api/auth/session'],
  });

  const userId = sessionData?.data?.id || sessionData?.data?._id;

  const { data: profileData, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/profile/${userId}`],
    enabled: !!userId,
  });

  const user = profileData?.data?.admin || profileData?.admin || profileData?.data || profileData;

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullname: user?.fullname || user?.full_name || user?.name || '',
        email: user?.email || '',
        username: user?.username || user?.userName || '',
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const transformedData = {
        full_name: data.fullname,
        email: data.email,
        username: data.username,
      };
      return apiRequest('PATCH', `/api/admin/profile`, transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/profile/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/admin/change-password`, data);
    },
    onSuccess: () => {
      setIsEditingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">My Profile</h2>
          <p className="text-muted-foreground">Manage your account information and security</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              {!isEditingProfile && (
                <Button 
                  onClick={() => {
                    setProfileForm({
                      fullname: user?.full_name || user?.fullname || user?.name || '',
                      email: user?.email || '',
                      username: user?.username || user?.userName || '',
                    });
                    setIsEditingProfile(true);
                  }}
                  data-testid="button-edit-profile"
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user?.profilepic} alt={user?.fullname || user?.name} />
                      <AvatarFallback className="text-2xl">
                        {user?.fullname || user?.name ? getInitials(user.fullname || user.name) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullname">Full Name</Label>
                      <Input
                        id="fullname"
                        value={profileForm.fullname}
                        onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                        data-testid="input-fullname"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        data-testid="input-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex justify-center mb-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user?.profilepic} alt={user?.fullname || user?.name} />
                      <AvatarFallback className="text-2xl">
                        {user?.fullname || user?.name ? getInitials(user.fullname || user.name) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="text-sm font-medium p-2 bg-muted rounded-md" data-testid="text-fullname">
                        {user?.full_name || user?.fullname || user?.name || 'Not set'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Username</Label>
                      <p className="text-sm font-medium p-2 bg-muted rounded-md" data-testid="text-username">
                        {user?.username || user?.userName || 'Not set'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm font-medium p-2 bg-muted rounded-md" data-testid="text-email">
                        {user?.email || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
              {!isEditingPassword && (
                <Button
                  onClick={() => setIsEditingPassword(true)}
                  variant="outline"
                  data-testid="button-change-password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              )}
            </CardHeader>
            {isEditingPassword && (
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      data-testid="input-current-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={6}
                      data-testid="input-new-password"
                    />
                    <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                      data-testid="input-confirm-password"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setPasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      }}
                      data-testid="button-cancel-password"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      data-testid="button-save-password"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
