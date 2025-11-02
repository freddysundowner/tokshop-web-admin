import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MoreHorizontal,
  Package,
  Pencil,
  Trash2,
  Eye,
  Plus,
  Upload,
  RefreshCw,
  CheckSquare,
  Square,
  Tag,
  Truck,
  DollarSign,
  ToggleLeft,
  Package2,
  Edit,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import type { IconaProduct, IconaProductsResponse } from "@shared/schema";
import { format } from "date-fns";
import { CompletePagination } from "@/components/ui/pagination";
import { CSVUploadModal } from "@/components/inventory/csv-upload-modal";

const statusColors = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  out_of_stock:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusPriority = {
  active: 1,
  out_of_stock: 2,
  draft: 3,
  inactive: 4,
};

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  
  // Bulk edit form state
  const [bulkEditForm, setBulkEditForm] = useState({
    updateCategory: false,
    updateShipping: false,
    updateStatus: false,
    updatePrice: false,
    updateInventory: false,
    categoryId: '',
    shippingProfileId: '',
    status: '',
    priceAmount: '',
    inventoryAmount: '',
  });
  
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    data: productResponse,
    isLoading,
    error: productsError,
    isError,
    refetch,
  } = useQuery<IconaProductsResponse>({
    queryKey: [
      "external-products",
      user?.id,
      statusFilter,
      categoryFilter,
      currentPage,
      itemsPerPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        params.set("userId", user.id);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (categoryFilter && categoryFilter !== "all") {
        params.set("categoryId", categoryFilter);
      }
      // Add type parameter for inventory
      params.set("type", "inventory");
      // Add pagination parameters
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());

      const response = await fetch(
        `/api/products?${params.toString()}`,
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
  });

  // Fetch shipping profiles for bulk assignment
  const {
    data: shippingProfiles,
    error: shippingProfilesError,
    isLoading: shippingProfilesLoading,
  } = useQuery({
    queryKey: ["shipping-profiles", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/shipping/profiles/${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch shipping profiles");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete product mutation (placeholder)
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/products/${productId}/delete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleEditProduct = (product: IconaProduct) => {
    navigate(`/inventory/edit/${product._id}`);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleViewProduct = (product: IconaProduct) => {
    // TODO: Open product details modal or navigate to details page
    toast({ title: `View product: ${product.name}` });
  };

  const handleAddProduct = () => {
    navigate("/inventory/add");
  };

  const handleBulkUpload = () => {
    setShowCSVUpload(true);
  };

  const handleCSVUploadSuccess = () => {
    // Refresh the product list after successful upload
    refetch();
  };

  // Bulk selection handlers
  const handleSelectProduct = (productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    const products = productResponse?.products || [];
    if (selected) {
      setSelectedProducts(new Set(products.map((p: any) => p._id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleBulkAssignCategory = async (categoryId: string) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates: { 
          category: categoryId,
          status: 'active' // Move from draft to active when category is assigned
        }
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        toast({ 
          title: 'Success', 
          description: `Category assigned to ${productIds.length} products` 
        });
      } else {
        throw new Error('Failed to assign category');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to assign category to products', 
        variant: 'destructive' 
      });
    }
  };

  const handleBulkAssignShipping = async (shippingProfileId: string) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates: { 
          shippingProfile: shippingProfileId,
          status: 'active' // Move from draft to active when shipping is assigned
        }
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        toast({ 
          title: 'Success', 
          description: `Shipping profile assigned to ${productIds.length} products` 
        });
      } else {
        throw new Error('Failed to assign shipping profile');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to assign shipping profile to products', 
        variant: 'destructive' 
      });
    }
  };

  const handleBulkPriceUpdate = async (priceUpdate: { type: 'increase' | 'decrease', amount: number, isPercentage: boolean }) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      
      // We'll need to get current prices and calculate new ones
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates: { 
          priceUpdate 
        }
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        toast({ 
          title: 'Success', 
          description: `Prices updated for ${productIds.length} products` 
        });
      } else {
        throw new Error('Failed to update prices');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update product prices', 
        variant: 'destructive' 
      });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates: { status }
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        toast({ 
          title: 'Success', 
          description: `Status updated to ${status} for ${productIds.length} products` 
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update product status', 
        variant: 'destructive' 
      });
    }
  };

  const handleBulkInventoryUpdate = async (inventoryUpdate: { type: 'set' | 'increase' | 'decrease', amount: number }) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates: { 
          inventoryUpdate 
        }
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        toast({ 
          title: 'Success', 
          description: `Inventory updated for ${productIds.length} products` 
        });
      } else {
        throw new Error('Failed to update inventory');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update product inventory', 
        variant: 'destructive' 
      });
    }
  };

  // Unified Bulk Edit Form Handlers
  const handleBulkEditCheckboxChange = (field: string, checked: boolean) => {
    setBulkEditForm(prev => ({
      ...prev,
      [field]: checked,
      // Reset field-specific values when unchecked
      ...(field === 'updateCategory' && !checked && { categoryId: '' }),
      ...(field === 'updateShipping' && !checked && { shippingProfileId: '' }),
      ...(field === 'updateStatus' && !checked && { status: '' }),
      ...(field === 'updatePrice' && !checked && { priceAmount: '' }),
      ...(field === 'updateInventory' && !checked && { inventoryAmount: '' }),
    }));
  };

  const handleBulkEditFormChange = (field: string, value: any) => {
    setBulkEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetBulkEditForm = () => {
    setBulkEditForm({
      updateCategory: false,
      updateShipping: false,
      updateStatus: false,
      updatePrice: false,
      updateInventory: false,
      categoryId: '',
      shippingProfileId: '',
      status: '',
      priceAmount: '',
      inventoryAmount: '',
    });
  };

  const handleUnifiedBulkEdit = async () => {
    if (selectedProducts.size === 0) return;
    
    try {
      const productIds = Array.from(selectedProducts);
      const updates: any = {};
      
      if (bulkEditForm.updateCategory && bulkEditForm.categoryId) {
        updates.category = bulkEditForm.categoryId;
      }
      
      if (bulkEditForm.updateShipping && bulkEditForm.shippingProfileId) {
        updates.shippingProfile = bulkEditForm.shippingProfileId;
      }
      
      if (bulkEditForm.updateStatus && bulkEditForm.status) {
        updates.status = bulkEditForm.status;
      }
      
      if (bulkEditForm.updatePrice && bulkEditForm.priceAmount !== '') {
        updates.price = Number(bulkEditForm.priceAmount);
      }
      
      if (bulkEditForm.updateInventory && bulkEditForm.inventoryAmount !== '') {
        updates.quantity = Number(bulkEditForm.inventoryAmount);
      }
      
      // Only proceed if at least one field is selected
      if (Object.keys(updates).length === 0) {
        toast({
          title: 'No Updates Selected',
          description: 'Please select at least one field to update',
          variant: 'destructive'
        });
        return;
      }
      
      const response = await apiRequest('PUT', '/api/products/bulkedit', {
        productIds,
        updates
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['external-products'] });
        setSelectedProducts(new Set());
        setShowBulkEdit(false);
        resetBulkEditForm();
        
        const updateCount = Object.keys(updates).length;
        toast({
          title: 'Success',
          description: `${updateCount} field${updateCount > 1 ? 's' : ''} updated for ${productIds.length} products`
        });
      } else {
        throw new Error('Failed to update products');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update products',
        variant: 'destructive'
      });
    }
  };

  const isBulkEditFormValid = () => {
    const hasSelectedField = bulkEditForm.updateCategory || bulkEditForm.updateShipping || 
                            bulkEditForm.updateStatus || bulkEditForm.updatePrice || bulkEditForm.updateInventory;
    const hasValidValues = 
      (!bulkEditForm.updateCategory || bulkEditForm.categoryId) &&
      (!bulkEditForm.updateShipping || bulkEditForm.shippingProfileId) &&
      (!bulkEditForm.updateStatus || bulkEditForm.status) &&
      (!bulkEditForm.updatePrice || (bulkEditForm.priceAmount !== '' && !isNaN(Number(bulkEditForm.priceAmount)) && Number(bulkEditForm.priceAmount) >= 0)) &&
      (!bulkEditForm.updateInventory || (bulkEditForm.inventoryAmount !== '' && !isNaN(Number(bulkEditForm.inventoryAmount)) && Number(bulkEditForm.inventoryAmount) >= 0));
    
    return hasSelectedField && hasValidValues;
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

  const handleCategoryFilterChange = (newCategory: string) => {
    setCategoryFilter(newCategory);
    resetPaginationOnFilterChange();
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    resetPaginationOnFilterChange();
  };

  // Extract products array from the response
  const products = productResponse?.products || [];
  const totalProducts = productResponse?.totalDoc || 0;
  const totalPages = productResponse?.pages || 0;

  // Get unique categories from products for the filter dropdown
  const uniqueCategories =
    products?.reduce((acc: any[], product) => {
      if (
        product.category &&
        product.category._id &&
        !acc.find((c) => c._id === product.category!._id)
      ) {
        acc.push(product.category);
      }
      return acc;
    }, []) || [];

  // Apply client-side search and sorting (filtering is done server-side now)
  const filteredProducts =
    products
      ?.filter((product: IconaProduct) => {
        const searchMatch =
          searchTerm === "" ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase());

        return searchMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return (
              new Date(b.createdAt || "").getTime() -
              new Date(a.createdAt || "").getTime()
            );
          case "oldest":
            return (
              new Date(a.createdAt || "").getTime() -
              new Date(b.createdAt || "").getTime()
            );
          case "name":
            return a.name.localeCompare(b.name);
          case "price-high":
            return b.price - a.price;
          case "price-low":
            return a.price - b.price;
          case "quantity-high":
            return b.quantity - a.quantity;
          case "quantity-low":
            return a.quantity - b.quantity;
          case "status":
            return (
              (statusPriority[a.status as keyof typeof statusPriority] || 99) -
              (statusPriority[b.status as keyof typeof statusPriority] || 99)
            );
          default:
            return 0;
        }
      }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const color =
      statusColors[status as keyof typeof statusColors] || statusColors.draft;
    return (
      <Badge variant="secondary" className={color}>
        {status?.replace("_", " ").toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">
              Manage your product inventory
            </p>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded w-full" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">
              Manage your product inventory
            </p>
          </div>
        </div>

        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unable to load inventory
          </h3>
          <p className="text-muted-foreground mb-4">
            {productsError?.message ||
              "There was an error loading your products. Please try again."}
          </p>
          <Button onClick={() => refetch()} data-testid="button-retry-products">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-inventory">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            data-testid="text-page-title"
          >
            Inventory
          </h1>
          <p
            className="text-muted-foreground"
            data-testid="text-page-description"
          >
            Manage your product inventory ({totalProducts} products)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBulkUpload}
            data-testid="button-bulk-upload"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleAddProduct} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger
              className="w-[140px]"
              data-testid="select-status-filter"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={handleCategoryFilterChange}
          >
            <SelectTrigger
              className="w-[140px]"
              data-testid="select-category-filter"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="quantity-high">Stock: High to Low</SelectItem>
              <SelectItem value="quantity-low">Stock: Low to High</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowBulkEdit(true)}
                  data-testid="button-bulk-edit"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bulk Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No products found
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your search or filters to find products."
              : "Get started by adding your first product to your inventory."}
          </p>
          {!searchTerm &&
            statusFilter === "all" &&
            categoryFilter === "all" && (
              <Button
                onClick={handleAddProduct}
                data-testid="button-add-first-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            )}
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium w-12">
                        <Checkbox
                          checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="text-left p-4 font-medium">Image</th>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Price</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => (
                      <tr
                        key={product._id}
                        className={`border-b hover:bg-muted/20 ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/10"
                        } ${selectedProducts.has(product._id) ? 'bg-primary/10' : ''} ${
                          product.status === 'draft' ? 'opacity-75 border-l-4 border-l-orange-300' : ''
                        }`}
                        data-testid={`row-product-${product._id}`}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selectedProducts.has(product._id)}
                            onCheckedChange={(checked) => handleSelectProduct(product._id, checked as boolean)}
                            data-testid={`checkbox-product-${product._id}`}
                          />
                        </td>
                        <td className="p-4">
                          <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                data-testid={`img-product-${product._id}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="max-w-xs">
                            <div
                              className="font-medium text-foreground truncate"
                              data-testid={`text-product-name-${product._id}`}
                            >
                              {product.name}
                            </div>
                            {product.description && (
                              <div
                                className="text-sm text-muted-foreground truncate mt-1"
                                data-testid={`text-product-description-${product._id}`}
                              >
                                {product.description}
                              </div>
                            )}
                            {(product as any).sku && (
                              <div className="text-xs text-muted-foreground mt-1">
                                SKU: {(product as any).sku}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-product-category-${product._id}`}
                          >
                            {product.category?.name || "Uncategorized"}
                          </Badge>
                        </td>

                        <td className="p-4">
                          <span
                            className="font-semibold text-foreground"
                            data-testid={`text-product-price-${product._id}`}
                          >
                            {formatCurrency(product.price)}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-medium ${
                                product.quantity === 0
                                  ? "text-destructive"
                                  : product.quantity <= 10
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-foreground"
                              }`}
                              data-testid={`text-product-quantity-${product._id}`}
                            >
                              {product.quantity}
                            </span>
                            {product.quantity === 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-1.5 py-0.5"
                                data-testid={`badge-out-of-stock-${product._id}`}
                              >
                                Out
                              </Badge>
                            )}
                            {product.quantity > 0 && product.quantity <= 10 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0.5 border-yellow-300 text-yellow-700 dark:text-yellow-400"
                                data-testid={`badge-low-stock-${product._id}`}
                              >
                                Low
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          {getStatusBadge(product.status || "draft")}
                        </td>

                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                data-testid={`button-product-actions-${product._id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewProduct(product)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditProduct(product)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteProduct(product._id, product.name)
                                }
                                className="text-destructive"
                                disabled={deleteProductMutation.isPending}
                              >
                                {deleteProductMutation.isPending ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <CompletePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalProducts}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[10, 20, 50, 100]}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            showingText="products"
            className="bg-white dark:bg-gray-950 rounded-lg border p-4"
          />
        </>
      )}

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUpload}
        onClose={() => setShowCSVUpload(false)}
        onSuccess={handleCSVUploadSuccess}
      />

      {/* Category Assignment Modal */}
      {showCategoryModal && (
        <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Category</DialogTitle>
              <DialogDescription>
                Choose a category to assign to {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {uniqueCategories.map((category) => (
                <Button
                  key={category._id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleBulkAssignCategory(category._id);
                    setShowCategoryModal(false);
                  }}
                  data-testid={`button-select-category-${category._id}`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shipping Profile Assignment Modal */}
      {showShippingModal && (
        <Dialog open={showShippingModal} onOpenChange={setShowShippingModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Shipping Profile</DialogTitle>
              <DialogDescription>
                Choose a shipping profile to assign to {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {shippingProfiles?.map((profile) => (
                <Button
                  key={profile._id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleBulkAssignShipping((profile as any)._id);
                    setShowShippingModal(false);
                  }}
                  data-testid={`button-select-shipping-${profile._id}`}
                >
                  {profile.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Price Update Modal */}
      {showPriceModal && (
        <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Prices</DialogTitle>
              <DialogDescription>
                Update prices for {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline" 
                  onClick={() => {
                    const amount = window.prompt("Increase price by what percentage?", "10");
                    if (amount && !isNaN(Number(amount))) {
                      handleBulkPriceUpdate({ type: 'increase', amount: Number(amount), isPercentage: true });
                      setShowPriceModal(false);
                    }
                  }}
                  data-testid="button-price-increase-percent"
                >
                  Increase by %
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const amount = window.prompt("Decrease price by what percentage?", "10");
                    if (amount && !isNaN(Number(amount))) {
                      handleBulkPriceUpdate({ type: 'decrease', amount: Number(amount), isPercentage: true });
                      setShowPriceModal(false);
                    }
                  }}
                  data-testid="button-price-decrease-percent"
                >
                  Decrease by %
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const amount = window.prompt("Increase price by what amount?", "5.00");
                    if (amount && !isNaN(Number(amount))) {
                      handleBulkPriceUpdate({ type: 'increase', amount: Number(amount), isPercentage: false });
                      setShowPriceModal(false);
                    }
                  }}
                  data-testid="button-price-increase-amount"
                >
                  Increase by $
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const amount = window.prompt("Decrease price by what amount?", "5.00");
                    if (amount && !isNaN(Number(amount))) {
                      handleBulkPriceUpdate({ type: 'decrease', amount: Number(amount), isPercentage: false });
                      setShowPriceModal(false);
                    }
                  }}
                  data-testid="button-price-decrease-amount"
                >
                  Decrease by $
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Status</DialogTitle>
              <DialogDescription>
                Set status for {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {['active', 'inactive', 'draft'].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  className="w-full justify-start capitalize"
                  onClick={() => {
                    handleBulkStatusUpdate(status);
                    setShowStatusModal(false);
                  }}
                  data-testid={`button-set-status-${status}`}
                >
                  Set to {status}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Inventory Update Modal */}
      {showInventoryModal && (
        <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Inventory</DialogTitle>
              <DialogDescription>
                Update inventory for {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const price = window.prompt("Set inventory to what price?", "100");
                    if (price && !isNaN(Number(price)) && Number(price) >= 0) {
                      handleBulkInventoryUpdate({ type: 'set', amount: Number(price) });
                      setShowInventoryModal(false);
                    }
                  }}
                  data-testid="button-inventory-set"
                >
                  Set Quantity
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const price = window.prompt("Increase inventory by what price?", "10");
                    if (price && !isNaN(Number(price))) {
                      handleBulkInventoryUpdate({ type: 'increase', amount: Number(price) });
                      setShowInventoryModal(false);
                    }
                  }}
                  data-testid="button-inventory-increase"
                >
                  Increase Quantity
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const price = window.prompt("Decrease inventory by what price?", "10");
                    if (price && !isNaN(Number(price))) {
                      handleBulkInventoryUpdate({ type: 'decrease', amount: Number(price) });
                      setShowInventoryModal(false);
                    }
                  }}
                  data-testid="button-inventory-decrease"
                >
                  Decrease Quantity
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Unified Bulk Edit Modal */}
      {showBulkEdit && (
        <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Bulk Edit Products
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Update {selectedProducts.size} selected products
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Category Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-category"
                    checked={bulkEditForm.updateCategory}
                    onCheckedChange={(checked) => handleBulkEditCheckboxChange('updateCategory', checked as boolean)}
                    data-testid="checkbox-update-category"
                  />
                  <label htmlFor="update-category" className="text-sm font-medium">
                    Update Category
                  </label>
                </div>
                <div className="ml-6 space-y-2">
                  <Select
                    value={bulkEditForm.categoryId}
                    onValueChange={(value) => handleBulkEditFormChange('categoryId', value)}
                    disabled={!bulkEditForm.updateCategory}
                  >
                    <SelectTrigger data-testid="select-bulk-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shipping Profile Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-shipping"
                    checked={bulkEditForm.updateShipping}
                    onCheckedChange={(checked) => handleBulkEditCheckboxChange('updateShipping', checked as boolean)}
                    data-testid="checkbox-update-shipping"
                  />
                  <label htmlFor="update-shipping" className="text-sm font-medium">
                    Update Shipping Profile
                  </label>
                </div>
                <div className="ml-6 space-y-2">
                  <Select
                    value={bulkEditForm.shippingProfileId}
                    onValueChange={(value) => handleBulkEditFormChange('shippingProfileId', value)}
                    disabled={!bulkEditForm.updateShipping}
                  >
                    <SelectTrigger data-testid="select-bulk-shipping">
                      <SelectValue placeholder="Select shipping profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingProfiles?.map((profile: any) => (
                        <SelectItem key={profile._id} value={profile._id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-status"
                    checked={bulkEditForm.updateStatus}
                    onCheckedChange={(checked) => handleBulkEditCheckboxChange('updateStatus', checked as boolean)}
                    data-testid="checkbox-update-status"
                  />
                  <label htmlFor="update-status" className="text-sm font-medium">
                    Update Status
                  </label>
                </div>
                <div className="ml-6 space-y-2">
                  <Select
                    value={bulkEditForm.status}
                    onValueChange={(value) => handleBulkEditFormChange('status', value)}
                    disabled={!bulkEditForm.updateStatus}
                  >
                    <SelectTrigger data-testid="select-bulk-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-price"
                    checked={bulkEditForm.updatePrice}
                    onCheckedChange={(checked) => handleBulkEditCheckboxChange('updatePrice', checked as boolean)}
                    data-testid="checkbox-update-price"
                  />
                  <label htmlFor="update-price" className="text-sm font-medium">
                    Update Price
                  </label>
                </div>
                <div className="ml-6">
                  <input 
                    type="number" 
                    placeholder="Price" 
                    value={bulkEditForm.priceAmount}
                    onChange={(e) => handleBulkEditFormChange('priceAmount', e.target.value)}
                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!bulkEditForm.updatePrice}
                    data-testid="input-price-amount"
                  />
                </div>
              </div>

              {/* Inventory Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-inventory"
                    checked={bulkEditForm.updateInventory}
                    onCheckedChange={(checked) => handleBulkEditCheckboxChange('updateInventory', checked as boolean)}
                    data-testid="checkbox-update-inventory"
                  />
                  <label htmlFor="update-inventory" className="text-sm font-medium">
                    Update Inventory
                  </label>
                </div>
                <div className="ml-6">
                  <input 
                    type="number" 
                    placeholder="Quantity" 
                    value={bulkEditForm.inventoryAmount}
                    onChange={(e) => handleBulkEditFormChange('inventoryAmount', e.target.value)}
                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!bulkEditForm.updateInventory}
                    data-testid="input-inventory-amount"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedProducts.size} products will be updated
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBulkEdit(false);
                    resetBulkEditForm();
                  }}
                  data-testid="button-bulk-edit-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={!isBulkEditFormValid()}
                  onClick={handleUnifiedBulkEdit}
                  data-testid="button-bulk-edit-submit"
                >
                  Update Products
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
