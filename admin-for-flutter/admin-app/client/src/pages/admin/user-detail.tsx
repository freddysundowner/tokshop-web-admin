import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, MapPin, Truck, Package, ShoppingCart, Activity, CreditCard, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUserDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/users/:userId");
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const userId = params?.userId;
  const [activeActivityTab, setActiveActivityTab] = useState<string>("orders");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Redirect if not admin (in useEffect to avoid render-phase side effects)
  useEffect(() => {
    if (!user?.admin) {
      setLocation("/");
    }
  }, [user?.admin, setLocation]);

  // Mutation to approve user as seller
  const approveSellerMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/approve-seller`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      toast({
        title: "Success",
        description: "User approved as seller successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve seller",
        variant: "destructive",
      });
    },
  });

  // Mutation to update user details (for revoking seller status)
  const updateUserMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleSellerToggle = (checked: boolean) => {
    if (checked) {
      // Use approve seller endpoint when enabling seller status
      const userEmail = userInfo?.email || '';
      approveSellerMutation.mutate(userEmail);
    } else {
      // Use update endpoint when disabling seller status
      updateUserMutation.mutate({ seller: false });
    }
  };

  // Fetch user details - always fetch fresh data from users/:id endpoint
  const { data: userData, isLoading: loadingUser } = useQuery<{ success: boolean; data: any }>({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !!userId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Fetch user addresses
  const { data: addressesData, isLoading: loadingAddresses } = useQuery<any>({
    queryKey: [`/api/address/all/${userId}`],
    enabled: !!userId,
  });

  // Fetch user shipping profiles
  const { data: shippingData, isLoading: loadingShipping } = useQuery<any>({
    queryKey: [`/api/shipping/profiles/${userId}`],
    enabled: !!userId,
  });

  // Fetch user inventory
  const { data: inventoryData, isLoading: loadingInventory } = useQuery<any>({
    queryKey: ['/api/products', userId],
    enabled: !!userId,
  });

  // Fetch user orders (as seller - where userId matches) - only when Orders tab is active
  const { data: ordersData, isLoading: loadingOrders } = useQuery<any>({
    queryKey: ['/api/orders', userId, activeActivityTab],
    enabled: !!userId && (activeActivityTab === 'orders' || activeActivityTab === 'giveaways'),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Fetch user purchases (as customer) - only when Purchases or Giveaways tab is active
  const { data: purchasesData, isLoading: loadingPurchases } = useQuery<any>({
    queryKey: [`purchases-for-customer`, userId, activeActivityTab],
    queryFn: async () => {
      const response = await fetch(`/api/orders?customer=${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch purchases');
      }
      return await response.json();
    },
    enabled: !!userId && (activeActivityTab === 'purchases' || activeActivityTab === 'giveaways'),
  });

  // Fetch user transactions - only when Transactions tab is active
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery<any>({
    queryKey: [`/api/admin/transactions`, userId, activeActivityTab],
    queryFn: async () => {
      const response = await fetch(`/api/admin/transactions?userId=${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return await response.json();
    },
    enabled: !!userId && activeActivityTab === 'transactions',
  });

  // Fetch app settings for support email
  const { data: settingsData } = useQuery<any>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
  });

  const userInfo = userData?.data;
  const addresses = addressesData?.data || addressesData || [];
  const shippingProfiles = shippingData?.data || shippingData || [];
  const inventory = inventoryData?.products || inventoryData?.data || [];
  const orders = ordersData?.orders || ordersData?.data || [];
  const purchases = purchasesData?.orders || purchasesData?.data || [];
  const transactionsArray = transactionsData?.data?.data || transactionsData?.transactions || transactionsData?.data || [];
  const transactions = Array.isArray(transactionsArray) ? transactionsArray : [];
  const supportEmail = settingsData?.support_email || 'support@icona.com';
  const settingsStripeFee = settingsData?.stripe_fee || '0';
  const settingsExtraCharges = settingsData?.extra_charges || '0';
  const allActivities = [...orders, ...purchases];
  const giveaways = allActivities.filter((order: any) => order.ordertype === 'giveaway' || order.orderType === 'giveaway');

  if (loadingUser) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading user details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!userInfo) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground">User not found</p>
            <Button onClick={() => setLocation("/admin")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-to-admin"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
        {/* User Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Complete user information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userInfo.profilePhoto} />
                <AvatarFallback className="text-2xl">
                  {userInfo.firstName?.[0]}{userInfo.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium" data-testid="text-user-name">
                    {userInfo.firstName} {userInfo.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium" data-testid="text-user-email">{userInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium" data-testid="text-user-username">{userInfo.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{userInfo.country || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{userInfo.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Default Payment Method</p>
                  <p className="font-medium" data-testid="text-default-payment-method">
                    {typeof userInfo.defaultpaymentmethod === 'object' && userInfo.defaultpaymentmethod
                      ? `${(userInfo.defaultpaymentmethod.type || 'Card').replace(/_/g, ' ')} ending in ${userInfo.defaultpaymentmethod.last4 || '****'}`
                      : userInfo.defaultpaymentmethod ? String(userInfo.defaultpaymentmethod).replace(/_/g, ' ') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge variant={userInfo.seller ? "default" : "secondary"}>
                    {userInfo.seller ? "Seller" : "Customer"}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Admin Controls */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-4">Admin Controls</h3>
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label htmlFor="seller-toggle" className="text-base">
                    Seller Account
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this user to sell products on the platform
                  </p>
                </div>
                <Switch
                  id="seller-toggle"
                  checked={userInfo.seller}
                  onCheckedChange={handleSellerToggle}
                  disabled={approveSellerMutation.isPending || updateUserMutation.isPending}
                  data-testid="switch-seller-status"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different data sections */}
        <Tabs defaultValue="addresses" className="w-full">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:w-full sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="addresses" data-testid="tab-addresses" className="flex-shrink-0 sm:flex-shrink">
                <MapPin className="h-4 w-4 mr-2 hidden sm:inline" />
                Addresses ({addresses.length})
              </TabsTrigger>
              <TabsTrigger value="shipping" data-testid="tab-shipping" className="flex-shrink-0 sm:flex-shrink">
                <Truck className="h-4 w-4 mr-2 hidden sm:inline" />
                Shipping Profiles ({shippingProfiles.length})
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-inventory" className="flex-shrink-0 sm:flex-shrink">
                <Package className="h-4 w-4 mr-2 hidden sm:inline" />
                Inventory ({inventory.length})
              </TabsTrigger>
              <TabsTrigger value="activities" data-testid="tab-activities" className="flex-shrink-0 sm:flex-shrink">
                <Activity className="h-4 w-4 mr-2 hidden sm:inline" />
                Activities
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <Card>
              <CardHeader>
                <CardTitle>User Addresses</CardTitle>
                <CardDescription>All saved addresses for this user</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAddresses ? (
                  <div className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading addresses...</p>
                  </div>
                ) : addresses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No addresses found</p>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address: any, index: number) => (
                      <div key={address._id || index} className="border rounded-lg p-4" data-testid={`address-${index}`}>
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">{address.name}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/users/${userId}/details/addresses/${address._id}`)}
                            data-testid={`button-view-address-${index}`}
                          >
                            View Details
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{address.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{address.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Address</p>
                            <p className="font-medium">{address.address}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">City/Region</p>
                            <p className="font-medium">{address.city}, {address.region}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Country</p>
                            <p className="font-medium">{address.country}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Profiles Tab */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Profiles</CardTitle>
                <CardDescription>User's shipping configurations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingShipping ? (
                  <div className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading shipping profiles...</p>
                  </div>
                ) : shippingProfiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No shipping profiles found</p>
                ) : (
                  <div className="space-y-4">
                    {shippingProfiles.map((profile: any, index: number) => (
                      <div key={profile._id || index} className="border rounded-lg p-4" data-testid={`shipping-profile-${index}`}>
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">Shipping Profile #{index + 1}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/users/${userId}/details/shipping-profiles/${profile._id}`)}
                            data-testid={`button-view-shipping-${index}`}
                          >
                            View Details
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {Object.entries(profile).map(([key, value]: [string, any]) => {
                            if (key === '_id' || key === '__v' || key === 'userId' || key === 'user' || key === 'taxCode') return null;
                            return (
                              <div key={key}>
                                <p className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="break-words">{
                                  typeof value === 'object' && value !== null 
                                    ? JSON.stringify(value) 
                                    : String(value || 'N/A')
                                }</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>All products listed by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInventory ? (
                  <div className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading inventory...</p>
                  </div>
                ) : inventory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No inventory found</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.map((product: any) => (
                          <TableRow key={product._id || product.id} data-testid={`product-${product._id || product.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                {product.images?.[0] && (
                                  <img src={product.images[0]} alt={product.name} className="h-10 w-10 rounded object-cover" />
                                )}
                                <div>
                                  <div>{product.name}</div>
                                  <div className="text-sm text-muted-foreground">{product.description?.substring(0, 50)}...</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>${product.price}</TableCell>
                            <TableCell>{product.quantity || 0}</TableCell>
                            <TableCell>{product.category?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={product.active ? "default" : "secondary"}>
                                {product.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/admin/users/${userId}/details/inventory/${product._id || product.id}`)}
                                data-testid={`button-view-product-${product._id || product.id}`}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>User Activities</CardTitle>
                <CardDescription>Orders, purchases, and giveaways</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="orders" className="w-full" onValueChange={setActiveActivityTab}>
                  <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="inline-flex w-full min-w-max sm:w-full sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                      <TabsTrigger value="orders" data-testid="tab-activities-orders" className="flex-shrink-0 sm:flex-shrink">
                        Orders
                      </TabsTrigger>
                      <TabsTrigger value="purchases" data-testid="tab-activities-purchases" className="flex-shrink-0 sm:flex-shrink">
                        Purchases
                      </TabsTrigger>
                      <TabsTrigger value="giveaways" data-testid="tab-activities-giveaways" className="flex-shrink-0 sm:flex-shrink">
                        Giveaways
                      </TabsTrigger>
                      <TabsTrigger value="transactions" data-testid="tab-activities-transactions" className="flex-shrink-0 sm:flex-shrink">
                        <CreditCard className="h-4 w-4 mr-2 hidden sm:inline" />
                        Transactions
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Orders Sub-tab */}
                  <TabsContent value="orders">
                    {loadingOrders ? (
                      <div className="text-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading orders...</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No orders found</p>
                    ) : (
                      <div className="rounded-md border mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders.map((order: any) => {
                              const orderTotal = order.items?.reduce((sum: number, item: any) => {
                                return sum + (item.total || item.totalPrice || item.price || 0);
                              }, 0) || 0;
                              
                              return (
                                <TableRow key={order._id || order.id} data-testid={`order-${order._id || order.id}`}>
                                  <TableCell className="font-medium">{order.invoice || 'N/A'}</TableCell>
                                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                  <TableCell>{order.items?.length || 0} items</TableCell>
                                  <TableCell>${orderTotal.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge>{order.status || 'pending'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setLocation(`/admin/users/${userId}/details/orders/${order._id || order.id}`)}
                                      data-testid={`button-view-order-${order._id || order.id}`}
                                    >
                                      View Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Purchases Sub-tab */}
                  <TabsContent value="purchases">
                    {loadingPurchases ? (
                      <div className="text-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading purchases...</p>
                      </div>
                    ) : purchases.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No purchases found</p>
                    ) : (
                      <div className="rounded-md border mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((order: any) => {
                              const orderTotal = order.items?.reduce((sum: number, item: any) => {
                                return sum + (item.total || item.totalPrice || item.price || 0);
                              }, 0) || 0;
                              
                              return (
                                <TableRow key={order._id || order.id} data-testid={`purchase-${order._id || order.id}`}>
                                  <TableCell className="font-medium">{order.invoice || 'N/A'}</TableCell>
                                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                  <TableCell>{order.items?.length || 0} items</TableCell>
                                  <TableCell>${orderTotal.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge>{order.status || 'pending'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setLocation(`/admin/users/${userId}/details/orders/${order._id || order.id}`)}
                                      data-testid={`button-view-purchase-${order._id || order.id}`}
                                    >
                                      View Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Giveaways Sub-tab */}
                  <TabsContent value="giveaways">
                    {loadingOrders || loadingPurchases ? (
                      <div className="text-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading giveaways...</p>
                      </div>
                    ) : giveaways.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No giveaways found</p>
                    ) : (
                      <div className="rounded-md border mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {giveaways.map((order: any) => {
                              const orderTotal = order.items?.reduce((sum: number, item: any) => {
                                return sum + (item.total || item.totalPrice || item.price || 0);
                              }, 0) || 0;
                              
                              return (
                                <TableRow key={order._id || order.id} data-testid={`giveaway-${order._id || order.id}`}>
                                  <TableCell className="font-medium">{order.invoice || 'N/A'}</TableCell>
                                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                  <TableCell>{order.items?.length || 0} items</TableCell>
                                  <TableCell>${orderTotal.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge>{order.status || 'pending'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setLocation(`/admin/users/${userId}/details/orders/${order._id || order.id}`)}
                                      data-testid={`button-view-giveaway-${order._id || order.id}`}
                                    >
                                      View Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Transactions Sub-tab */}
                  <TabsContent value="transactions">
                    {loadingTransactions ? (
                      <div className="text-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading transactions...</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No transactions found</p>
                    ) : (
                      <div className="rounded-md border mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transaction ID</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>To</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction: any) => {
                              const transactionId = transaction._id || transaction.id;
                              const fromName = typeof transaction.from === 'object'
                                ? `${transaction.from.firstName || ''} ${transaction.from.lastName || ''}`.trim() || 
                                  transaction.from.userName || 
                                  transaction.from.email || 'Unknown'
                                : 'Unknown';
                              const toName = typeof transaction.to === 'object'
                                ? `${transaction.to.firstName || ''} ${transaction.to.lastName || ''}`.trim() || 
                                  transaction.to.userName || 
                                  transaction.to.email || 'Unknown'
                                : 'Unknown';
                              const amount = transaction.amount || 0;
                              const type = transaction.type || 'N/A';
                              const status = transaction.status || 'pending';
                              const getStatusColor = (status: string) => {
                                switch (status.toLowerCase()) {
                                  case 'completed': return 'default';
                                  case 'pending': return 'secondary';
                                  case 'failed': return 'destructive';
                                  default: return 'secondary';
                                }
                              };

                              return (
                                <TableRow key={transactionId} data-testid={`transaction-${transactionId}`}>
                                  <TableCell className="font-mono text-xs">{String(transactionId).slice(-8)}</TableCell>
                                  <TableCell>{fromName}</TableCell>
                                  <TableCell>{toName}</TableCell>
                                  <TableCell className="capitalize">{type}</TableCell>
                                  <TableCell>${amount.toFixed(2)}</TableCell>
                                  <TableCell>
                                    {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getStatusColor(status)}>{status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (transaction.receipt) {
                                          window.open(transaction.receipt, '_blank');
                                        } else {
                                          setSelectedTransaction(transaction);
                                          setShowReceipt(true);
                                        }
                                      }}
                                      data-testid={`button-print-receipt-${transactionId}`}
                                    >
                                      <Printer className="h-4 w-4 mr-2" />
                                      Receipt
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div id="receipt-content-user" className="space-y-4 p-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">{settings.app_name}</h2>
                <p className="text-sm text-muted-foreground">Transaction Receipt</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono">{String(selectedTransaction._id || selectedTransaction.id).slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>
                    {selectedTransaction.createdAt 
                      ? new Date(selectedTransaction.createdAt).toLocaleDateString() 
                      : selectedTransaction.date 
                        ? new Date(selectedTransaction.date).toLocaleDateString()
                        : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedTransaction.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={
                    (selectedTransaction.status || 'pending').toLowerCase() === 'completed' ? 'default' :
                    (selectedTransaction.status || 'pending').toLowerCase() === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {selectedTransaction.status || 'pending'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">
                    {typeof selectedTransaction.from === 'object'
                      ? `${selectedTransaction.from.firstName || ''} ${selectedTransaction.from.lastName || ''}`.trim() || 
                        selectedTransaction.from.userName || 
                        selectedTransaction.from.email || 'Unknown'
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {typeof selectedTransaction.to === 'object'
                      ? `${selectedTransaction.to.firstName || ''} ${selectedTransaction.to.lastName || ''}`.trim() || 
                        selectedTransaction.to.userName || 
                        selectedTransaction.to.email || 'Unknown'
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span>${(parseFloat(selectedTransaction.total) || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  const stripeFee = parseFloat(selectedTransaction.stripe_fee) || 0;
                  const extraCharges = parseFloat(selectedTransaction.extra_charges) || 0;
                  const combined = stripeFee + extraCharges;
                  return combined > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Charge ({settingsStripeFee}% + {settingsExtraCharges}%):</span>
                      <span className="text-destructive">-${combined.toFixed(2)}</span>
                    </div>
                  );
                })()}
                {selectedTransaction.serviceFee && parseFloat(selectedTransaction.serviceFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee:</span>
                    <span className="text-destructive">-${parseFloat(selectedTransaction.serviceFee).toFixed(2)}</span>
                  </div>
                )}
                {selectedTransaction.shippingFee && parseFloat(selectedTransaction.shippingFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping Fee:</span>
                    <span className="text-destructive">-${parseFloat(selectedTransaction.shippingFee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                  <span>Amount:</span>
                  <span>${(parseFloat(selectedTransaction.amount) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>Thank you for your business!</p>
                <p>For support, please contact {supportEmail}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReceipt(false)} data-testid="button-close-receipt">
              Close
            </Button>
            <Button 
              onClick={() => {
                const content = document.getElementById('receipt-content-user');
                if (content) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receipt</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                            .space-y-4 > * + * { margin-top: 1rem; }
                            .space-y-2 > * + * { margin-top: 0.5rem; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .items-center { align-items: center; }
                            .text-center { text-align: center; }
                            .border-b { border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
                            .border-t { border-top: 1px solid #ddd; padding-top: 1rem; }
                            .text-muted-foreground { color: #666; }
                            .font-mono { font-family: monospace; }
                            .font-bold { font-weight: bold; }
                            .font-medium { font-weight: 500; }
                            .text-lg { font-size: 1.125rem; }
                            .text-2xl { font-size: 1.5rem; }
                            .text-xs { font-size: 0.75rem; }
                            .text-sm { font-size: 0.875rem; }
                            .capitalize { text-transform: capitalize; }
                          </style>
                        </head>
                        <body>
                          ${content.innerHTML}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }
                }
              }}
              data-testid="button-print-receipt-dialog"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
