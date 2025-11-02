import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  Weight,
  Ruler,
} from "lucide-react";
import type { IconaShippingProfile, IconaShippingProfilesResponse } from "@shared/schema";

const WEIGHT_UNIT_OPTIONS = [
  { key: "lb", label: "Pound (lb)" },
  { key: "oz", label: "Ounce (oz)" },
  { key: "kg", label: "Kilogram (kg)" },
  { key: "g", label: "Gram (g)" }
];

interface ShippingProfileFormData {
  name: string;
  description: string;
  weight: number;
  scale: string;
}

export default function ShippingProfiles() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<IconaShippingProfile | null>(null);
  const [formData, setFormData] = useState<ShippingProfileFormData>({
    name: "",
    description: "",
    weight: 0,
    scale: "oz",
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const userId = (user as any)?._id || user?.id;
  
  // Fetch fresh user data to check current seller status
  const { data: freshUserData } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Use fresh user data if available, otherwise fall back to cached user
  const currentUser = freshUserData || user;

  // Fetch shipping profiles
  const {
    data: shippingProfiles = [],
    isLoading,
    error,
  } = useQuery<IconaShippingProfilesResponse>({
    queryKey: ["shipping-profiles", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/shipping/profiles/${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shipping profiles");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Create shipping profile mutation
  const createMutation = useMutation({
    mutationFn: async (data: ShippingProfileFormData) => {
      const response = await apiRequest("POST", `/api/shipping/profiles/${user?.id}`, data);
      if (!response.ok) {
        throw new Error("Failed to create shipping profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-profiles"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Shipping profile created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create shipping profile",
        variant: "destructive",
      });
    },
  });

  // Update shipping profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ShippingProfileFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PUT", `/api/shipping/profiles/${id}`, {
        ...updateData,
        userId: user?.id,
      });
      if (!response.ok) {
        throw new Error("Failed to update shipping profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-profiles"] });
      setIsEditDialogOpen(false);
      setEditingProfile(null);
      resetForm();
      toast({
        title: "Success",
        description: "Shipping profile updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update shipping profile",
        variant: "destructive",
      });
    },
  });

  // Delete shipping profile mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/shipping/profiles/${id}`, {});
      if (!response.ok) {
        throw new Error("Failed to delete shipping profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-profiles"] });
      toast({
        title: "Success",
        description: "Shipping profile deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete shipping profile",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      weight: 0,
      scale: "oz",
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (profile: IconaShippingProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      weight: profile.weight,
      scale: profile.scale,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProfile) {
      updateMutation.mutate({ ...formData, id: editingProfile._id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (!currentUser?.seller) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          Only sellers can access shipping profiles management.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shipping Profiles</h1>
          <p className="text-muted-foreground">
            Manage your shipping profiles and settings
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-profile">
          <Plus className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error loading profiles
          </h3>
          <p className="text-muted-foreground">
            Failed to load shipping profiles. Please try again.
          </p>
        </Card>
      ) : shippingProfiles.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No shipping profiles
          </h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first shipping profile.
          </p>
          <Button onClick={handleCreate} data-testid="button-create-first-profile">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Profile
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shippingProfiles.map((profile) => (
            <Card key={profile._id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-foreground">
                      {profile.name}
                    </CardTitle>
                    {profile.description && (
                      <CardDescription className="mt-1">
                        {profile.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`dropdown-profile-${profile._id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEdit(profile)}
                        data-testid={`button-edit-${profile._id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            data-testid={`button-delete-${profile._id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Shipping Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{profile.name}"? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(profile._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Weight className="h-4 w-4" />
                    <span>{profile.weight} {profile.scale}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingProfile(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Shipping Profile" : "Create Shipping Profile"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Update the shipping profile details below."
                : "Create a new shipping profile for your products."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Shipping"
                required
                data-testid="input-profile-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                data-testid="input-profile-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                  data-testid="input-profile-weight"
                />
              </div>
              <div>
                <Label htmlFor="scale">Unit</Label>
                <Select
                  value={formData.scale}
                  onValueChange={(value) => setFormData({ ...formData, scale: value })}
                  required
                >
                  <SelectTrigger data-testid="select-profile-scale">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingProfile(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingProfile
                  ? "Update Profile"
                  : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}