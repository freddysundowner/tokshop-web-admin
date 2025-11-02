import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, ShoppingCart, Truck, Package } from "lucide-react";

export default function AdminUserItemDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/users/:userId/details/:itemType/:itemId");
  const { userId, itemType, itemId } = params || {};

  // Fetch data based on item type using non-admin endpoints
  const getQueryKey = () => {
    switch(itemType) {
      case 'addresses':
        return [`/api/address/all/${userId}`];
      case 'shipping-profiles':
        return [`/api/shipping/profiles/${userId}`];
      case 'inventory':
        return ['/api/products', userId];
      case 'orders':
        return ['/api/orders', userId];
      default:
        return [`/api/admin/users/${userId}/${itemType}`];
    }
  };

  const { data: itemsData, isLoading } = useQuery<any>({
    queryKey: getQueryKey(),
    enabled: !!userId && !!itemType,
  });

  // Extract items from different response formats
  const getItems = () => {
    if (!itemsData) return [];
    
    // For products endpoint
    if (itemsData.products) return itemsData.products;
    
    // For orders endpoint
    if (itemsData.orders) return itemsData.orders;
    
    // For direct array responses (addresses, shipping profiles)
    if (Array.isArray(itemsData)) return itemsData;
    
    // For wrapped responses
    if (Array.isArray(itemsData.data)) return itemsData.data;
    
    return [];
  };

  const items = getItems();
  const item = items.find((i: any) => (i._id || i.id) === itemId);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!item) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground">Item not found</p>
            <Button onClick={() => setLocation(`/admin/users/${userId}`)} className="mt-4">
              Back to User
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getIcon = () => {
    switch(itemType) {
      case 'addresses': return MapPin;
      case 'orders': return ShoppingCart;
      case 'shipping-profiles': return Truck;
      case 'inventory': return Package;
      default: return Package;
    }
  };

  const getTitle = () => {
    switch(itemType) {
      case 'addresses': return 'Address Details';
      case 'orders': return `Order #${item.invoice || item._id}`;
      case 'shipping-profiles': return 'Shipping Profile Details';
      case 'inventory': return 'Inventory Item Details';
      default: return 'Item Details';
    }
  };

  const Icon = getIcon();

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/admin/users/${userId}`)}
            data-testid="button-back-to-user"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to User
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            {itemType === 'orders' && <TabsTrigger value="items" data-testid="tab-items">Items</TabsTrigger>}
            {itemType === 'inventory' && <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>{getTitle()}</CardTitle>
                    <CardDescription>Basic information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {itemType === 'addresses' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium text-lg">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-lg">{item.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium text-lg">{item.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge>{item.isDefault ? 'Default' : 'Secondary'}</Badge>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{item.address}, {item.city}, {item.region}, {item.country}</p>
                    </div>
                  </div>
                )}

                {itemType === 'orders' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{item.status || 'pending'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium text-2xl">${((item.total || 0) + (item.servicefee || 0) + (item.tax || 0) + (item.shipping_fee || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {itemType === 'shipping-profiles' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(item).map(([key, value]: [string, any]) => {
                      if (key === '_id' || key === '__v' || key === 'userId' || key === 'user' || key === 'taxCode') return null;
                      return (
                        <div key={key}>
                          <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="font-medium text-lg break-words">{
                            typeof value === 'object' && value !== null 
                              ? JSON.stringify(value) 
                              : String(value || 'N/A')
                          }</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {itemType === 'inventory' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(item).map(([key, value]: [string, any]) => {
                      // Skip internal fields and unwanted fields
                      if (key === '_id' || key === '__v' || key === 'userId' || key === 'orderId' || 
                          key === 'ownerId' || key === 'favorite' || key === 'deleted' || key === 'reviews' ||
                          key === 'favorited' || key === 'discountedPrice' || key === 'colors' || 
                          key === 'tokshow' || key === 'tiktokshow') return null;
                      
                      // Handle images - display actual images
                      if (key === 'images' && Array.isArray(value) && value.length > 0) {
                        return (
                          <div key={key} className="md:col-span-2">
                            <p className="text-sm text-muted-foreground capitalize mb-2">Images</p>
                            <div className="flex flex-wrap gap-2">
                              {value.map((img: string, idx: number) => (
                                <img key={idx} src={img} alt={`Product ${idx + 1}`} className="h-24 w-24 rounded object-cover border" />
                              ))}
                            </div>
                          </div>
                        );
                      }
                      
                      // Handle featured boolean
                      if (key === 'featured') {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Featured</p>
                            <Badge variant={value ? "default" : "secondary"}>
                              {value ? "Yes" : "No"}
                            </Badge>
                          </div>
                        );
                      }
                      
                      // Handle listing_type - remove underscores
                      if (key === 'listing_type') {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Listing Type</p>
                            <p className="font-medium text-lg">{String(value || 'N/A').replace(/_/g, ' ')}</p>
                          </div>
                        );
                      }
                      
                      // Handle sizes - join array with commas
                      if (key === 'sizes' && Array.isArray(value)) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Sizes</p>
                            <p className="font-medium text-lg">{value.join(', ') || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      // Handle category - show just the name
                      if (key === 'category' && typeof value === 'object' && value !== null) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Category</p>
                            <p className="font-medium text-lg">{value.name || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      // Handle shippingProfile - show just the name
                      if ((key === 'shippingProfile' || key === 'shipping_profile') && typeof value === 'object' && value !== null) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Shipping Profile</p>
                            <p className="font-medium text-lg">{value.name || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={key} className={key === 'description' ? 'md:col-span-2' : ''}>
                          <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="font-medium text-lg break-words">{
                            typeof value === 'object' && value !== null 
                              ? JSON.stringify(value) 
                              : String(value || 'N/A')
                          }</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Complete Details</CardTitle>
                <CardDescription>All available information</CardDescription>
              </CardHeader>
              <CardContent>
                {itemType === 'addresses' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium text-lg">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-lg">{item.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone Number</p>
                      <p className="font-medium text-lg">{item.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address Type</p>
                      <p className="font-medium text-lg">{item.isDefault ? 'Default' : 'Secondary'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Street Address</p>
                      <p className="font-medium text-lg">{item.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium text-lg">{item.city}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Region/State</p>
                      <p className="font-medium text-lg">{item.region}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Postal Code</p>
                      <p className="font-medium text-lg">{item.postalCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium text-lg">{item.country}</p>
                    </div>
                  </div>
                )}

                {itemType === 'orders' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Order Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Invoice Number</p>
                          <p className="font-medium">{item.invoice || item._id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Order Date</p>
                          <p className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge>{item.status || 'pending'}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="font-medium text-xl">${((item.total || 0) + (item.servicefee || 0) + (item.tax || 0) + (item.shipping_fee || 0)).toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="font-medium">{item.notes || 'No notes'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{`${item.customer?.firstName || ''} ${item.customer?.lastName || ''}`.trim() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{item.customer?.email || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Shipping Address</p>
                          <p className="font-medium">
                            {item.customer?.address 
                              ? `${item.customer.address.addrress1}, ${item.customer.address.city}, ${item.customer.address.state} ${item.customer.address.zipcode}`
                              : 'N/A'}
                          </p>
                        </div>
                        {item.customer?.address?.phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{item.customer.address.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Seller Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{`${item.seller?.firstName || ''} ${item.seller?.lastName || ''}`.trim() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{item.seller?.email || 'N/A'}</p>
                        </div>
                        {item.seller?.userName && (
                          <div>
                            <p className="text-sm text-muted-foreground">Username</p>
                            <p className="font-medium">{item.seller.userName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {itemType === 'shipping-profiles' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(item).map(([key, value]: [string, any]) => {
                      if (key === '_id' || key === '__v' || key === 'userId' || key === 'user' || key === 'taxCode') return null;
                      return (
                        <div key={key} className={key === 'description' ? 'md:col-span-2' : ''}>
                          <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="font-medium text-lg break-words">{
                            typeof value === 'object' && value !== null 
                              ? JSON.stringify(value) 
                              : String(value || 'N/A')
                          }</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {itemType === 'inventory' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(item).map(([key, value]: [string, any]) => {
                      // Skip internal fields and unwanted fields
                      if (key === '_id' || key === '__v' || key === 'userId' || key === 'orderId' || 
                          key === 'ownerId' || key === 'favorite' || key === 'deleted' || key === 'reviews' ||
                          key === 'favorited' || key === 'discountedPrice' || key === 'colors' || 
                          key === 'tokshow' || key === 'tiktokshow') return null;
                      
                      // Handle images - display actual images
                      if (key === 'images' && Array.isArray(value) && value.length > 0) {
                        return (
                          <div key={key} className="md:col-span-2">
                            <p className="text-sm text-muted-foreground capitalize mb-2">Images</p>
                            <div className="flex flex-wrap gap-2">
                              {value.map((img: string, idx: number) => (
                                <img key={idx} src={img} alt={`Product ${idx + 1}`} className="h-24 w-24 rounded object-cover border" />
                              ))}
                            </div>
                          </div>
                        );
                      }
                      
                      // Handle featured boolean
                      if (key === 'featured') {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Featured</p>
                            <Badge variant={value ? "default" : "secondary"}>
                              {value ? "Yes" : "No"}
                            </Badge>
                          </div>
                        );
                      }
                      
                      // Handle listing_type - remove underscores
                      if (key === 'listing_type') {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Listing Type</p>
                            <p className="font-medium text-lg">{String(value || 'N/A').replace(/_/g, ' ')}</p>
                          </div>
                        );
                      }
                      
                      // Handle sizes - join array with commas
                      if (key === 'sizes' && Array.isArray(value)) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Sizes</p>
                            <p className="font-medium text-lg">{value.join(', ') || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      // Handle category - show just the name
                      if (key === 'category' && typeof value === 'object' && value !== null) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Category</p>
                            <p className="font-medium text-lg">{value.name || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      // Handle shippingProfile - show just the name
                      if ((key === 'shippingProfile' || key === 'shipping_profile') && typeof value === 'object' && value !== null) {
                        return (
                          <div key={key}>
                            <p className="text-sm text-muted-foreground capitalize">Shipping Profile</p>
                            <p className="font-medium text-lg">{value.name || 'N/A'}</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={key} className={key === 'description' ? 'md:col-span-2' : ''}>
                          <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="font-medium text-lg break-words">{
                            typeof value === 'object' && value !== null 
                              ? JSON.stringify(value) 
                              : String(value || 'N/A')
                          }</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Items Tab (Only for Orders) */}
          {itemType === 'orders' && (
            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Order Items</CardTitle>
                      <CardDescription>Products in this order</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!item.items || item.items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No items in this order</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.items.map((orderItem: any, index: number) => (
                            <TableRow key={orderItem._id || index}>
                              <TableCell className="font-medium">{orderItem.productId?.name || 'N/A'}</TableCell>
                              <TableCell>{orderItem.quantity || 1}</TableCell>
                              <TableCell>${orderItem.price || 0}</TableCell>
                              <TableCell className="text-right">${(orderItem.quantity || 1) * (orderItem.price || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Reviews Tab (Only for Inventory) */}
          {itemType === 'inventory' && (
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Product Reviews</CardTitle>
                      <CardDescription>Customer reviews for this product</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!item.reviews || item.reviews.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                  ) : (
                    <div className="space-y-4">
                      {item.reviews.map((review: any, index: number) => (
                        <div key={review._id || index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{review.userName || review.user?.name || 'Anonymous'}</p>
                              <p className="text-sm text-muted-foreground">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span className="text-lg font-semibold">{review.rating || 'N/A'}</span>
                              <span className="text-sm text-muted-foreground ml-1">/ 5</span>
                            </div>
                          </div>
                          <p className="text-sm">{review.comment || review.review || 'No comment'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
