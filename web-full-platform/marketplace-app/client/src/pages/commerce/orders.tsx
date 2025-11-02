import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, Package, Printer, Truck, Ship, X, MessageSquare, Info } from "lucide-react";
import type { IconaOrder, IconaOrdersResponse } from "@shared/schema";
import { calculateOrderTotal, formatCurrency, calculateOrderSubtotal } from "@shared/pricing";
import { useSettings } from "@/lib/settings-context";
import { format } from "date-fns";
import { CompletePagination } from "@/components/ui/pagination";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { getOrCreateChat } from "@/lib/firebase-chat";

const statusColors = {
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const statusPriority = {
  processing: 1,
  shipped: 2,
  delivered: 3,
  ended: 4,
  cancelled: 5,
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedOrder, setSelectedOrder] = useState<IconaOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [, setLocation] = useLocation();
  const [messagingOrderId, setMessagingOrderId] = useState<string | null>(null);

  const { data: orderResponse, isLoading, error: ordersError, isError, refetch } = useQuery<IconaOrdersResponse>({
    queryKey: ["external-orders", user?.id, statusFilter, selectedCustomerId, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        // Orders page always shows seller orders (using userId parameter)
        // Non-sellers won't see this page - they get redirected to purchases
        console.log("User seller status:", user.seller);
        params.set("userId", user.id);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (selectedCustomerId && selectedCustomerId !== "all") {
        params.set("customerId", selectedCustomerId);
      }
      // Add pagination parameters
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());

      const response = await fetch(
        `/api/orders?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id, // Only run query when user ID is available
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Ship order mutation
  const shipOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shipped",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark order as shipped');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-orders"] });
      toast({ title: "Order marked as shipped" });
    },
    onError: () => {
      toast({ title: "Failed to mark order as shipped", variant: "destructive" });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-orders"] });
      toast({ title: "Order cancelled" });
      setDrawerOpen(false); // Close drawer after successful cancellation
    },
    onError: () => {
      toast({ title: "Failed to cancel order", variant: "destructive" });
    },
  });


  const handlePrintLabel = (order: IconaOrder) => {
    if (order.label) {
      window.open(order.label, '_blank');
    } else {
      toast({ title: "No shipping label available", variant: "destructive" });
    }
  };

  const handleTrackPackage = (order: IconaOrder) => {
    if (order.tracking_number) {
      // TODO: Open tracking modal or navigate to tracking page
      toast({ title: `Tracking: ${order.tracking_number}` });
    } else {
      toast({ title: "No tracking number available", variant: "destructive" });
    }
  };

  const handleShipOrder = (orderId: string) => {
    shipOrderMutation.mutate(orderId);
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  // Handle message buyer from table
  const handleMessageBuyer = async (order: IconaOrder) => {
    const buyerId = order.customer?._id;
    const currentUserId = (user as any)?._id || (user as any)?.id;
    
    if (!buyerId || !currentUserId) {
      toast({
        title: "Error",
        description: "Unable to start chat. User information is missing.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setMessagingOrderId(order._id);
      
      const currentUserData = {
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        userName: (user as any)?.userName || '',
        profilePhoto: (user as any)?.profilePhoto || ''
      };
      
      const buyerData = {
        firstName: order.customer?.firstName || '',
        lastName: order.customer?.lastName || '',
        userName: order.customer?.userName || '',
        profilePhoto: order.customer?.profilePhoto || ''
      };
      
      const chatId = await getOrCreateChat(
        currentUserId,
        buyerId,
        currentUserData,
        buyerData
      );
      
      setLocation('/inbox/' + chatId);
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setMessagingOrderId(null);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset pagination when filters change
  const resetPaginationOnFilterChange = () => {
    setCurrentPage(1);
  };

  // Update filters to reset pagination
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    resetPaginationOnFilterChange();
  };

  const handleCustomerFilterChange = (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    resetPaginationOnFilterChange();
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    resetPaginationOnFilterChange();
  };

  // Extract orders array from the response
  const orders = orderResponse?.orders || [];

  // Use centralized calculation function
  const calculateTotal = calculateOrderTotal;

  // Calculate net earnings for an order
  const calculateNetEarnings = (order: IconaOrder) => {
    // If it's a giveaway, earnings are 0
    if (order.giveaway || order.ordertype === 'giveaway') {
      return 0;
    }
    
    const price = calculateOrderSubtotal(order);
    const commissionRate = settings.commission_rate || 0;
    const serviceFee = (price * commissionRate) / 100;
    const processingFeeRate = 2.9;
    const processingFeeFixed = 0.30;
    const orderTotal = price + (order.tax || 0) + (order.shipping_fee || 0);
    const processingFee = (orderTotal * (processingFeeRate / 100)) + processingFeeFixed;
    const sellerShippingCost = order.seller_shipping_fee_pay || 0;
    return price - serviceFee - processingFee - sellerShippingCost;
  };

  // Get unique customers from orders for the filter dropdown
  const uniqueCustomers = orders?.reduce((acc: any[], order) => {
    if (order.customer && !acc.find(c => c._id === order.customer._id)) {
      acc.push(order.customer);
    }
    return acc;
  }, []) || [];

  // Apply client-side search and sorting (filtering is done server-side now)
  const filteredOrders = orders?.filter((order: IconaOrder) => {
    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
    const orderNumber = order.invoice?.toString() || order._id.slice(-8);
    const itemName = order.giveaway?.name || '';
    
    const matchesSearch = searchTerm === "" || 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }).sort((a: IconaOrder, b: IconaOrder) => {
    switch (sortBy) {
      case "newest":
        const aDate = a.date ? new Date(a.date) : new Date(a.createdAt || 0);
        const bDate = b.date ? new Date(b.date) : new Date(b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      case "oldest":
        const aDateOld = a.date ? new Date(a.date) : new Date(a.createdAt || 0);
        const bDateOld = b.date ? new Date(b.date) : new Date(b.createdAt || 0);
        return aDateOld.getTime() - bDateOld.getTime();
      case "amount-high":
        return calculateTotal(b) - calculateTotal(a);
      case "amount-low":
        return calculateTotal(a) - calculateTotal(b);
      case "status":
        const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 999;
        const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 999;
        return aPriority - bPriority;
      default:
        return 0;
    }
  }) || [];

  // Calculate overview stats - use pagination data
  const totalOrders = orderResponse?.total || 0;
  const totalPages = orderResponse?.pages || 0;
  const currentPageRevenue = orders?.reduce((sum, order) => sum + calculateTotal(order), 0) || 0;
  const processingCount = orders?.filter(order => order.status === "processing").length || 0;
  const shippingCount = orders?.filter(order => order.status === "shipped").length || 0;
  const deliveredCount = orders?.filter(order => order.status === "delivered" || order.status === "ended").length || 0;

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="px-4 sm:px-6 md:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-8"></div>
            <div className="grid grid-cols-5 gap-4 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry functionality
  if (isError) {
    return (
      <div className="py-6">
        <div className="px-4 sm:px-6 md:px-8">
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-destructive text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Failed to Load Orders
                </h2>
                <p className="text-muted-foreground mb-4">
                  {ordersError?.message || "Something went wrong while loading your orders. Please try again."}
                </p>
                <Button 
                  onClick={() => refetch()}
                  data-testid="button-retry-orders"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-orders-title">
            Orders
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all your customer orders
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-2xl" data-testid="metric-total-orders">
                {totalOrders}
              </CardTitle>
            </CardHeader>
          </Card>
          
          {user?.seller !== false && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Page Revenue</CardDescription>
                <CardTitle className="text-2xl" data-testid="metric-total-revenue">
                  {formatCurrency(currentPageRevenue)}
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {user?.seller !== false && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Processing</CardDescription>
                <CardTitle className="text-2xl text-orange-600" data-testid="metric-processing">
                  {processingCount}
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Shipping</CardDescription>
              <CardTitle className="text-2xl text-blue-600" data-testid="metric-shipping">
                {shippingCount}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Delivered</CardDescription>
              <CardTitle className="text-2xl text-green-600" data-testid="metric-delivered">
                {deliveredCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="mb-6">
          <TabsList className={`grid w-full ${user?.seller === false ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'}`}>
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
            {user?.seller !== false && (
              <TabsTrigger value="processing" data-testid="tab-processing">
                Need Label
              </TabsTrigger>
            )}
            {user?.seller !== false && (
              <TabsTrigger
                value="ready_to_ship"
                data-testid="tab-ready-to-ship"
              >
                Ready to Ship
              </TabsTrigger>
            )}
            <TabsTrigger value="shipped" data-testid="tab-shipped">
              Shipped
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">
              Cancelled
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>
            
            {user?.seller !== false && (
              <div className="w-full sm:w-64">
                <Select
                  value={selectedCustomerId}
                  onValueChange={handleCustomerFilterChange}
                >
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Filter by customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {uniqueCustomers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.firstName} {customer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-orders">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                <SelectItem value="amount-low">Amount: Low to High</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {filteredOrders.length} of {totalOrders} orders
          </div>
        </div>


        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sales Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Earnings status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No orders found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all" 
                          ? "Try adjusting your search or filters" 
                          : "Orders will appear here when customers make purchases"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const productName = order.giveaway?.name || order.items?.[0]?.productId?.name || 'N/A';
                    const orderId = order.invoice || order._id.slice(-8);
                    const customerUsername = order.customer?.userName || 'Unknown';
                    const itemQuantity = order.giveaway ? 1 : (order.items?.length || 0);
                    const orderDate = order.date ? new Date(order.date) : new Date(order.createdAt || Date.now());
                    const price = calculateOrderSubtotal(order);
                    const earnings = calculateNetEarnings(order);
                    const orderStatus = order.status || 'processing';
                    const earningsStatus = (orderStatus === 'delivered' || orderStatus === 'ended') ? 'Completed' : 'In Transit';

                    return (
                      <tr 
                        key={order._id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        data-testid={`row-order-${order._id}`}
                        onClick={() => {
                          setSelectedOrder(order);
                          setDrawerOpen(true);
                        }}
                      >
                        {/* Order column - product name + order ID */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-foreground">
                            {productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Order #{orderId}
                          </div>
                        </td>

                        {/* Date column */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {format(orderDate, "dd MMM yyyy")}
                        </td>

                        {/* Customer column - username as link */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (order.customer?._id) {
                                setLocation('/profile/' + order.customer._id);
                              }
                            }}
                          >
                            {customerUsername}
                          </div>
                        </td>

                        {/* Items column */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {itemQuantity}
                        </td>

                        {/* Sales Channel column */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {order.tokshow ? 'Show' : 'Marketplace'}
                        </td>

                        {/* Price column - US$ format */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          US${price.toFixed(2)}
                        </td>

                        {/* Order Status column */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge 
                            className={statusColors[orderStatus as keyof typeof statusColors]}
                            data-testid={`order-status-${orderStatus}`}
                          >
                            {orderStatus === 'processing' ? 'In Transit' : orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                          </Badge>
                        </td>

                        {/* Earnings status column */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-foreground">
                            ${earnings.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{earningsStatus}</span>
                            <Info className="w-3 h-3" />
                          </div>
                        </td>

                        {/* Actions column - message icon */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-message-customer-${order._id}`}
                            disabled={messagingOrderId === order._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMessageBuyer(order);
                            }}
                          >
                            <MessageSquare size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination Controls */}
        <div className="mt-6">
          <CompletePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalOrders}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[10, 20, 50, 100]}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            showingText="orders"
            className="bg-white dark:bg-gray-950 rounded-lg border p-4"
          />
        </div>
      </div>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCancelOrder={handleCancelOrder}
        cancelLoading={cancelOrderMutation.isPending}
        onViewShipment={(order) => {
          // Store order data for shipments page to open the drawer
          sessionStorage.setItem('openShipmentDrawer', JSON.stringify(order));
          setDrawerOpen(false);
          setLocation('/shipping');
        }}
        onMessageBuyer={(order) => {
          // TODO: Implement messaging functionality
          toast({ title: "Messaging feature coming soon!" });
        }}
      />
    </div>
  );
}
