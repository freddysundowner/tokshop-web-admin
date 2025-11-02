import { useState, useEffect } from "react";
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
  MapPin,
  Home,
  Star,
  StarOff,
} from "lucide-react";
import type { Address } from "@shared/schema";
import { 
  LOCATION_DATA, 
  getStatesByCountry, 
  getCitiesByState,
  getCountryByCode,
  getStateByCode,
  type Country,
  type State 
} from "@/lib/location-data";

interface AddressFormData {
  name: string;
  addrress1: string; // Note: keeping the typo as in original schema
  addrress2: string;
  city: string;
  state: string;
  stateCode: string; // Add state code
  cityCode: string; // Add city code
  zipcode: string;
  countryCode: string;
  country: string;
  phone: string;
  email: string;
  userId: string;
}

// Using comprehensive location data from location-data.ts

export default function Addresses() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    name: "",
    addrress1: "",
    addrress2: "",
    city: "",
    state: "",
    stateCode: "",
    cityCode: "",
    zipcode: "",
    countryCode: "US",
    country: "United States",
    phone: "",
    email: "",
    userId: "",
  });

  // Dynamic location state
  const [availableStates, setAvailableStates] = useState<State[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedStateCode, setSelectedStateCode] = useState<string>("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize location data when country changes
  useEffect(() => {
    const states = getStatesByCountry(formData.countryCode);
    setAvailableStates(states);
    setAvailableCities([]);
    setSelectedStateCode("");
    
    // Reset state and city when country changes
    if (formData.countryCode) {
      setFormData(prev => ({
        ...prev,
        state: "",
        city: ""
      }));
    }
  }, [formData.countryCode]);

  // Update cities when state changes
  useEffect(() => {
    if (selectedStateCode && formData.countryCode) {
      const cities = getCitiesByState(formData.countryCode, selectedStateCode);
      setAvailableCities(cities);
      
      // Reset city when state changes
      setFormData(prev => ({
        ...prev,
        city: ""
      }));
    } else {
      setAvailableCities([]);
    }
  }, [selectedStateCode, formData.countryCode]);

  // Fetch addresses
  const {
    data: addresses = [],
    isLoading,
    error,
  } = useQuery<Address[]>({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/address/all/${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch addresses");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest("POST", "/api/address", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Address created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Address Validation Error",
        description: error.message, // Display the actual API validation message
        variant: "destructive",
      });
    },
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AddressFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PUT", `/api/address/${id}`, {
        ...updateData,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setIsEditDialogOpen(false);
      setEditingAddress(null);
      resetForm();
      toast({
        title: "Success",
        description: "Address updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Address Validation Error",
        description: error.message, // Display the actual API validation message
        variant: "destructive",
      });
    },
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/address/${id}`, {});
      if (!response.ok) {
        throw new Error("Failed to delete address");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast({
        title: "Success",
        description: "Address deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    },
  });

  // Make primary mutation
  const makePrimaryMutation = useMutation({
    mutationFn: async ({ id, primary, userId }: { id: string; primary: boolean; userId: string }) => {
      const response = await apiRequest("PATCH", `/api/address/${id}`, { primary, userId });
      if (!response.ok) {
        throw new Error("Failed to update address primary status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast({
        title: "Success",
        description: "Primary address updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update primary address",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      addrress1: "",
      addrress2: "",
      city: "",
      state: "",
      stateCode: "",
      cityCode: "",
      zipcode: "",
      countryCode: "US",
      country: "United States",
      phone: "",
      email: "",
      userId: "",
    });
    setSelectedStateCode("");
    setAvailableStates(getStatesByCountry("US"));
    setAvailableCities([]);
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    
    const countryCode = address.countryCode || "US";
    const states = getStatesByCountry(countryCode);
    setAvailableStates(states);
    
    // Find state code from state name or use existing
    let stateCode = "";
    if (address.state) {
      const foundState = states.find(s => s.name === address.state || s.code === address.state);
      stateCode = foundState?.code || "";
    }
    setSelectedStateCode(stateCode);
    
    // Set available cities if state is found
    if (stateCode) {
      const cities = getCitiesByState(countryCode, stateCode);
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
    
    // Set form data with proper city value and state code
    const formDataToSet = {
      name: address.name || "",
      addrress1: address.addrress1 || "",
      addrress2: address.addrress2 || "",
      city: address.city || "",
      state: address.state || "",
      stateCode: stateCode, // Use the found state code
      cityCode: "", // City codes are not easily available from the API response
      zipcode: address.zipcode || (address as any).zip || "", // API returns 'zip' not 'zipcode'
      countryCode: countryCode,
      country: address.country || "United States",
      phone: address.phone || "",
      email: address.email || "",
      userId: user?.id || "",
    };
    
    setFormData(formDataToSet);
    
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get name and email from user data instead of form
    const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.userName || user?.email || '';
    const userEmail = user?.email || '';
    
    const dataToSubmit = {
      ...formData,
      name: userName,
      email: userEmail,
    };
    
    if (editingAddress) {
      // Use _id if id is not available (external API returns _id)
      const addressId = editingAddress.id || (editingAddress as any)._id;
      updateMutation.mutate({ ...dataToSubmit, id: addressId });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleDelete = (address: Address) => {
    const addressId = address.id || (address as any)._id;
    deleteMutation.mutate(addressId);
  };

  const handleTogglePrimary = (address: Address, currentPrimary: boolean) => {
    const addressId = address.id || (address as any)._id;
    makePrimaryMutation.mutate({ id: addressId, primary: !currentPrimary, userId: user?.id || "" });
  };

  const handleCountryChange = (countryCode: string) => {
    const country = getCountryByCode(countryCode);
    setFormData({
      ...formData,
      countryCode,
      country: country?.name || countryCode,
      state: "",
      city: ""
    });
    setSelectedStateCode("");
  };

  const handleStateChange = (stateCode: string) => {
    const state = getStateByCode(formData.countryCode, stateCode);
    setSelectedStateCode(stateCode);
    setFormData({
      ...formData,
      state: state?.name || stateCode,
      stateCode: stateCode, // Add state code to form data
      city: "",
      cityCode: "" // Clear city code when state changes
    });
  };

  const handleCityChange = (city: string) => {
    setFormData({
      ...formData,
      city
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Addresses</h1>
          <p className="text-muted-foreground">
            Manage your shipping and billing addresses
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-address">
          <Plus className="h-4 w-4 mr-2" />
          Add Address
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
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error loading addresses
          </h3>
          <p className="text-muted-foreground">
            Failed to load addresses. Please try again.
          </p>
        </Card>
      ) : addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No addresses
          </h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first address.
          </p>
          <Button onClick={handleCreate} data-testid="button-create-first-address">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Address
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((address) => {
            const addressId = address.id || (address as any)._id;
            return (
              <Card key={addressId} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-foreground">
                          {address.name}
                        </CardTitle>
                        {address.primary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`dropdown-address-${addressId}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(address)}
                          data-testid={`button-edit-${addressId}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTogglePrimary(address, address.primary || false)}
                          data-testid={`button-primary-${addressId}`}
                        >
                          {address.primary ? (
                            <>
                              <StarOff className="h-4 w-4 mr-2" />
                              Remove Primary
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4 mr-2" />
                              Make Primary
                            </>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              data-testid={`button-delete-${addressId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Address</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{address.name}"? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(address)}
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
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>{address.addrress1}</div>
                    {address.addrress2 && <div>{address.addrress2}</div>}
                    <div>{address.city}, {address.state} {address.zipcode}</div>
                    <div>{address.country}</div>
                    {address.phone && <div>Phone: {address.phone}</div>}
                    {address.email && <div>Email: {address.email}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingAddress(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? "Update the address details below."
                : "Add a new shipping or billing address."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="addrress1">Street Address</Label>
              <Input
                id="addrress1"
                value={formData.addrress1}
                onChange={(e) => setFormData({ ...formData, addrress1: e.target.value })}
                placeholder="123 Main Street"
                required
                data-testid="input-address-street1"
              />
            </div>
            
            <div>
              <Label htmlFor="addrress2">Street Address 2 (Optional)</Label>
              <Input
                id="addrress2"
                value={formData.addrress2}
                onChange={(e) => setFormData({ ...formData, addrress2: e.target.value })}
                placeholder="Apt, Suite, Unit, etc."
                data-testid="input-address-street2"
              />
            </div>
            
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.countryCode}
                onValueChange={handleCountryChange}
                required
              >
                <SelectTrigger data-testid="select-address-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_DATA.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State/Province</Label>
                {availableStates.length > 0 ? (
                  <Select
                    value={selectedStateCode}
                    onValueChange={handleStateChange}
                    required
                  >
                    <SelectTrigger data-testid="select-address-state">
                      <SelectValue placeholder="Select state/province" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state/province"
                    required
                    data-testid="input-address-state"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                {availableCities.length > 0 ? (
                  <Select
                    value={(() => {
                      // Use editingAddress city if formData.city is empty (timing issue fix)
                      const cityToUse = formData.city || (editingAddress?.city) || "";
                      const cityInList = availableCities.includes(cityToUse);
                      
                      // If we're using the fallback city, update formData to sync it
                      if (!formData.city && editingAddress?.city && cityInList) {
                        // Use setTimeout to avoid state update during render
                        setTimeout(() => {
                          setFormData(prev => ({ ...prev, city: editingAddress.city || "" }));
                        }, 0);
                      }
                      
                      return cityInList ? cityToUse : "";
                    })()}
                    onValueChange={handleCityChange}
                    required
                  >
                    <SelectTrigger data-testid="select-address-city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    required
                    data-testid="input-address-city"
                  />
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="zipcode">ZIP/Postal Code</Label>
              <Input
                id="zipcode"
                value={formData.zipcode}
                onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                placeholder="10001"
                required
                data-testid="input-address-zip"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                required
                data-testid="input-address-phone"
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingAddress(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-address"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingAddress
                  ? "Update Address"
                  : "Add Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}