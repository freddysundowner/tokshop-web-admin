import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck, Store } from "lucide-react";

export default function AdminOrderDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/orders/:orderId");
  const orderId = params?.orderId;

  const { data: orderData, isLoading } = useQuery<any>({
    queryKey: [`admin-order-${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!orderId,
  });

  const order = orderData?.order || orderData?.data || orderData;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'shipped':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Order not found</p>
            <Button onClick={() => setLocation('/admin/orders')} className="mt-4">
              Back to Orders
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const customerName = typeof order.customer === 'object'
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.userName || order.customer.email
    : 'Unknown';

  const customerEmail = typeof order.customer === 'object' ? order.customer.email : '';

  // Calculate totals from items
  const calculateSubtotal = () => {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shippingFee = order.shipping_fee || order.shippingFee || order.shipping || 0;
  const tax = order.tax || 0;
  const total = subtotal + shippingFee + tax;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/orders')}
            className="mb-4"
            data-testid="button-back-to-orders"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Order Details</h2>
              <p className="text-muted-foreground">Order ID: {order.invoice || orderId}</p>
            </div>
            <Badge variant={getStatusColor(order.status)} className="text-lg py-2 px-4 w-fit" data-testid="badge-order-status">
              {order.status || 'pending'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Items
                </CardTitle>
                <CardDescription>{order.items?.length || 0} items</CardDescription>
              </CardHeader>
              <CardContent>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    {order.items.map((item: any, index: number) => {
                      // Product info is under item.productId.name
                      const productName = item.productId?.name || item.productId?.title || item.name || item.title || 'Unknown Product';
                      const productImage = item.productId?.image || item.productId?.images?.[0] || item.image || item.images?.[0];
                      const quantity = item.quantity || 1;
                      const price = item.price || 0;

                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg" data-testid={`order-item-${index}`}>
                          {productImage && (
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-16 h-16 object-cover rounded"
                              data-testid={`img-product-${index}`}
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-product-name-${index}`}>{productName}</p>
                            <p className="text-sm text-muted-foreground">Quantity: {quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${(price * quantity).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">${price.toFixed(2)} each</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No items found</p>
                )}
              </CardContent>
            </Card>

            {/* Order Summary - Moved below Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="order-summary">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping Fee</span>
                    <span>${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                    <span>Total</span>
                    <span data-testid="text-order-total">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1" data-testid="shipping-address">
                    {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                    {order.shippingAddress.city && (
                      <p>
                        {order.shippingAddress.city}
                        {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                        {order.shippingAddress.zipCode && ` ${order.shippingAddress.zipCode}`}
                      </p>
                    )}
                    {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="customer-info">
                  <div>
                    <p className="font-medium">{customerName}</p>
                    {customerEmail && <p className="text-sm text-muted-foreground">{customerEmail}</p>}
                  </div>
                  
                  {order.customer?.address && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Shipping Address</p>
                      <div className="text-sm space-y-1">
                        {order.customer.address.street && <p>{order.customer.address.street}</p>}
                        {order.customer.address.city && (
                          <p>
                            {order.customer.address.city}
                            {order.customer.address.state && `, ${order.customer.address.state}`}
                          </p>
                        )}
                        {(order.customer.address.zipcode || order.customer.address.zipCode) && (
                          <p>{order.customer.address.zipcode || order.customer.address.zipCode}</p>
                        )}
                        {order.customer.address.country && <p>{order.customer.address.country}</p>}
                        {order.customer.address.email && (
                          <p className="pt-1 text-muted-foreground">{order.customer.address.email}</p>
                        )}
                        {order.customer.address.phone && (
                          <p className="text-muted-foreground">{order.customer.address.phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            {order.seller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Seller
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2" data-testid="seller-info">
                    <p className="font-medium">
                      {typeof order.seller === 'object'
                        ? `${order.seller.firstName || ''} ${order.seller.lastName || ''}`.trim() || order.seller.userName || order.seller.email
                        : order.seller}
                    </p>
                    {typeof order.seller === 'object' && order.seller.email && (
                      <p className="text-sm text-muted-foreground">{order.seller.email}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm" data-testid="order-info">
                  <div>
                    <span className="text-muted-foreground">Order Date</span>
                    <p className="font-medium">{formatDate(order.createdAt || order.orderDate)}</p>
                  </div>
                  {order.shippeddate && (
                    <div>
                      <span className="text-muted-foreground">Shipped Date</span>
                      <p className="font-medium">{formatDate(order.shippeddate)}</p>
                    </div>
                  )}
                  {order.payment_status && (
                    <div>
                      <span className="text-muted-foreground">Payment Status</span>
                      <p className="font-medium capitalize" data-testid="text-payment-status">{order.payment_status}</p>
                    </div>
                  )}
                  {order.orderType && (
                    <div>
                      <span className="text-muted-foreground">Order Type</span>
                      <p className="font-medium capitalize">{order.orderType}</p>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div>
                      <span className="text-muted-foreground">Tracking Number</span>
                      <p className="font-medium font-mono text-xs" data-testid="text-tracking-number">{order.tracking_number}</p>
                    </div>
                  )}
                  {order.tracking_url && (
                    <div>
                      <span className="text-muted-foreground">Tracking URL</span>
                      <a 
                        href={order.tracking_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline block break-all"
                        data-testid="link-tracking-url"
                      >
                        Track Package →
                      </a>
                    </div>
                  )}
                  {order.label && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(order.label, '_blank')}
                        className="w-full"
                        data-testid="button-print-label"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Print Shipping Label
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
