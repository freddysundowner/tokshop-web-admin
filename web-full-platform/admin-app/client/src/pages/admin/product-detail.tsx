import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, DollarSign, Box, Tag, User, Image as ImageIcon, Truck } from "lucide-react";
import { useEffect } from "react";

export default function AdminProductDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/products/:productId");
  const { user } = useAuth();
  const productId = params?.productId;

  // Redirect if not admin
  useEffect(() => {
    if (!user?.admin) {
      setLocation("/");
    }
  }, [user?.admin, setLocation]);

  // Fetch product details
  const { data: product, isLoading } = useQuery<any>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="p-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/inventory")}
            className="mb-6"
            data-testid="button-back-to-inventory"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/inventory")}
          className="mb-6"
          data-testid="button-back-to-inventory"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{product.name}</CardTitle>
                  <Badge variant={product.status === 'active' || !product.status ? "default" : "secondary"}>
                    {product.status || 'active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm">{product.description || 'No description provided'}</p>
                </div>

                {product.images && product.images.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Product Images
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {product.images.map((image: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={image}
                            alt={`${product.name} - ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {product.ownerId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Product Owner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {typeof product.ownerId === 'object' ? (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium" data-testid="text-owner-name">
                            {product.ownerId.firstName && product.ownerId.lastName 
                              ? `${product.ownerId.firstName} ${product.ownerId.lastName}` 
                              : product.ownerId.userName || 'Unknown'}
                          </p>
                        </div>
                        {product.ownerId.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium text-sm break-all" data-testid="text-owner-email">
                              {product.ownerId.email}
                            </p>
                          </div>
                        )}
                        {product.ownerId.country && (
                          <div>
                            <p className="text-sm text-muted-foreground">Country</p>
                            <p className="font-medium" data-testid="text-owner-country">
                              {product.ownerId.country}
                            </p>
                          </div>
                        )}
                        {product.ownerId.seller !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Account Type</p>
                            <Badge variant={product.ownerId.seller ? "default" : "secondary"}>
                              {product.ownerId.seller ? "Seller" : "Customer"}
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">Owner ID</p>
                        <p className="font-mono text-xs break-all" data-testid="text-owner-id">
                          {String(product.ownerId)}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation(`/admin/users/${product.ownerId._id || product.ownerId}`)}
                    data-testid="button-view-seller"
                  >
                    View Full Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Product Details Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-product-price">
                  ${product.price?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Box className="h-5 w-5 mr-2" />
                  Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-product-stock">
                  {product.quantity || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">units available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-product-category">
                  {product.category?.name || product.category || 'Uncategorized'}
                </p>
              </CardContent>
            </Card>

            {product.shipping_profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Shipping Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {typeof product.shipping_profile === 'object' && product.shipping_profile ? (
                      <>
                        {product.shipping_profile.name && (
                          <div>
                            <p className="text-muted-foreground">Name</p>
                            <p className="font-medium" data-testid="text-shipping-name">{product.shipping_profile.name}</p>
                          </div>
                        )}
                        {product.shipping_profile.weight !== undefined && (
                          <div>
                            <p className="text-muted-foreground">Weight</p>
                            <p className="font-medium" data-testid="text-shipping-weight">
                              {product.shipping_profile.weight} {product.shipping_profile.scale || 'oz'}
                            </p>
                          </div>
                        )}
                        {(product.shipping_profile.length || product.shipping_profile.width || product.shipping_profile.height) && (
                          <div>
                            <p className="text-muted-foreground">Dimensions (L × W × H)</p>
                            <p className="font-medium" data-testid="text-shipping-dimensions">
                              {product.shipping_profile.length || 0} × {product.shipping_profile.width || 0} × {product.shipping_profile.height || 0} in
                            </p>
                          </div>
                        )}
                        {product.shipping_profile.description && (
                          <div>
                            <p className="text-muted-foreground">Description</p>
                            <p className="font-medium" data-testid="text-shipping-description">{product.shipping_profile.description}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-muted-foreground">Profile ID</p>
                        <p className="font-mono text-xs break-all" data-testid="text-shipping-id">
                          {String(product.shipping_profile)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
