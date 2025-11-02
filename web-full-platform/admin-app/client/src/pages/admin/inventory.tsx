import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Eye, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminInventory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Build query string with pagination, search, and filters
  let queryString = `/api/admin/products?page=${page}&limit=${limit}`;
  if (searchQuery) queryString += `&title=${encodeURIComponent(searchQuery)}`;
  if (categoryFilter && categoryFilter !== "all") queryString += `&category=${encodeURIComponent(categoryFilter)}`;
  if (priceFilter && priceFilter !== "all") queryString += `&price=${encodeURIComponent(priceFilter)}`;

  const { data: productsData, isLoading } = useQuery<{ 
    success: boolean; 
    data: {
      products: any[];
      totalDoc: number;
      limits: number;
      pages: number;
    };
  }>({
    queryKey: [queryString],
  });

  const products = productsData?.data?.products || [];
  
  // Get unique categories for filter dropdown (with ID and name)
  const categoryMap = new Map();
  products.forEach((p: any) => {
    if (p.category) {
      const categoryId = typeof p.category === 'object' ? p.category._id : p.category;
      const categoryName = typeof p.category === 'object' ? p.category.name : p.category;
      if (categoryId && !categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, categoryName);
      }
    }
  });
  const allCategories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));

  // Apply status filter on frontend (since API might not support it)
  const filteredProducts = statusFilter && statusFilter !== "all"
    ? products.filter((p: any) => {
        const productStatus = p.status || 'active';
        return productStatus === statusFilter;
      })
    : products;
  
  const pagination = productsData?.data ? {
    currentPage: page,
    totalPages: productsData.data.pages,
    totalItems: productsData.data.totalDoc,
    hasNextPage: page < productsData.data.pages,
    hasPrevPage: page > 1
  } : undefined;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, statusFilter, priceFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPriceFilter("all");
  };

  const hasActiveFilters = searchQuery || (categoryFilter && categoryFilter !== "all") || (statusFilter && statusFilter !== "all") || (priceFilter && priceFilter !== "all");

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-products">
                {pagination?.totalItems || products.length}
              </div>
              <p className="text-xs text-muted-foreground">All products in inventory</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-products">
                {products.filter((p: any) => p.status === 'active' || !p.status).length}
              </div>
              <p className="text-xs text-muted-foreground">On current page</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-categories-count">
                {new Set(products.map((p: any) => p.category?._id || p.category).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground">Unique categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>All Products</CardTitle>
                  <CardDescription>View and manage all product inventory</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="button-toggle-filters"
                    className="whitespace-nowrap"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">
                        {[
                          searchQuery, 
                          categoryFilter !== "all" && categoryFilter, 
                          statusFilter !== "all" && statusFilter, 
                          priceFilter !== "all" && priceFilter
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters Section */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-products"
                    />
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger data-testid="select-price-filter">
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-25">$0 - $25</SelectItem>
                      <SelectItem value="25-50">$25 - $50</SelectItem>
                      <SelectItem value="50-100">$50 - $100</SelectItem>
                      <SelectItem value="100-">$100+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products found</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Product</TableHead>
                        <TableHead className="hidden sm:table-cell">Owner</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden xl:table-cell">Price</TableHead>
                        <TableHead className="hidden 2xl:table-cell">Stock</TableHead>
                        <TableHead className="hidden 2xl:table-cell">Featured</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product: any) => (
                        <TableRow 
                          key={product._id || product.id} 
                          data-testid={`row-product-${product._id || product.id}`}
                          onClick={() => setLocation(`/admin/products/${product._id || product.id}`)}
                          className="cursor-pointer hover-elevate"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              {product.images?.[0] ? (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium truncate">{product.name}</div>
                                <div className="text-sm text-muted-foreground sm:hidden truncate">
                                  Owner: {typeof product.ownerId === 'object' 
                                    ? (product.ownerId.userName || product.ownerId.email || 'Unknown')
                                    : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell" data-testid={`text-owner-${product._id || product.id}`}>
                            <div className="max-w-[150px]">
                              {typeof product.ownerId === 'object' ? (
                                <div>
                                  <div className="font-medium truncate">
                                    {product.ownerId.firstName && product.ownerId.lastName 
                                      ? `${product.ownerId.firstName} ${product.ownerId.lastName}` 
                                      : product.ownerId.userName || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {product.ownerId.email || ''}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell" data-testid={`text-category-${product._id || product.id}`}>
                            {product.category?.name || product.category || 'Uncategorized'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell" data-testid={`text-type-${product._id || product.id}`}>
                            <Badge 
                              variant={
                                product.listing_type === 'auction' ? 'default' : 
                                product.listing_type === 'giveaway' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {product.listing_type === 'auction' ? 'Auction' : 
                               product.listing_type === 'giveaway' ? 'Giveaway' : 
                               product.listing_type === 'buy_now' ? 'Buy Now' : 
                               product.listing_type || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell" data-testid={`text-price-${product._id || product.id}`}>
                            ${product.price?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="hidden 2xl:table-cell">
                            {product.quantity || 0}
                          </TableCell>
                          <TableCell className="hidden 2xl:table-cell">
                            <Badge variant={product.featured ? "default" : "outline"} data-testid={`badge-featured-${product._id || product.id}`}>
                              {product.featured ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.status === 'active' || !product.status ? "default" : "secondary"}>
                              {product.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/admin/products/${product._id || product.id}`);
                              }}
                              data-testid={`button-view-product-${product._id || product.id}`}
                              className="whitespace-nowrap"
                            >
                              <Eye className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">View Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                      <span className="hidden sm:inline">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total products)</span>
                      <span className="sm:hidden">{pagination.currentPage} / {pagination.totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={!pagination.hasPrevPage}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={!pagination.hasNextPage}
                        data-testid="button-next-page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
