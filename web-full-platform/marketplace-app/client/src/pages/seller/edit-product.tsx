import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Save, X, Loader2, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageUploader } from "@/components/ui/image-uploader";
import {
  productFormSchema,
  type ProductFormData,
  type IconaProduct,
  type IconaCategoriesResponse,
  type IconaShippingProfilesResponse,
} from "@shared/schema";

export default function EditProduct() {
  const [, params] = useRoute("/inventory/edit/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Predefined color options
  const availableColors = [
    { name: "Red", color: "#f44336" },
    { name: "Blue", color: "#2196f3" },
    { name: "Green", color: "#4caf50" },
    { name: "Yellow", color: "#ffeb3b" },
    { name: "Black", color: "#000000" },
    { name: "White", color: "#ffffff" },
    { name: "Purple", color: "#9c27b0" },
    { name: "Orange", color: "#ff9800" },
    { name: "Gray", color: "#9e9e9e" },
  ];
  
  const productId = params?.id;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: undefined,
      quantity: undefined,
      category: "",
      listingType: "buy_now",
      weight: "",
      height: "",
      width: "",
      length: "",
      scale: "oz",
      shippingProfile: "",
      images: [],
      colors: [],
      sizes: [],
      featured: false,
      tokshow: "",
    },
  });

  // Fetch existing product data
  const { data: product, isLoading: loadingProduct, isError } = useQuery<IconaProduct>({
    queryKey: ["external-product", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID required");
      
      const response = await fetch(
        `/api/products/${productId}?userId=${user?.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!productId,
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery<IconaCategoriesResponse>({
    queryKey: ["external-categories", user?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/categories?userId=${user?.id}&status=active&page=1&limit=100`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch shipping profiles
  const { data: shippingProfilesResponse, isLoading: loadingShippingProfiles } = useQuery<IconaShippingProfilesResponse>({
    queryKey: ["external-shipping-profiles", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID required");

      const response = await fetch(
        `/api/shipping/profiles/${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch shipping profiles: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch shows
  const { data: showsResponse, isLoading: loadingShows } = useQuery<{ rooms: Array<{ _id: string; title: string }> }>({
    queryKey: ["external-shows", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID required");

      const response = await fetch(
        `/api/rooms?userid=${user.id}&status=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch shows: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Update form when product data is loaded
  useEffect(() => {
    if (product && categoriesResponse) {
      
      form.reset({
        name: product.name || "",
        description: product.description || "",
        price: product.price ?? undefined,
        quantity: product.quantity ?? undefined,
        category: product.category?._id || "",
        listingType: "buy_now", // Default since we don't have this field in the current schema
        weight: typeof product.weight === "string" ? product.weight : product.weight?.toString() || "",
        height: product.height || "",
        width: product.width || "",
        length: product.length || "",
        scale: product.scale || "oz",
        shippingProfile: product.shipping_profile?._id || "",
        images: product.images || [],
        colors: product.colors || [],
        sizes: product.sizes || [],
        featured: product.featured ?? false,
        tokshow: (product as any).tokshow?._id || (product as any).tokshow || "no-show",
      });
    }
  }, [product, categoriesResponse, form]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      if (!productId) throw new Error("Product ID required");
      
      // Use admin endpoint if user is admin, otherwise use regular endpoint
      const endpoint = user?.admin 
        ? `/api/admin/products/${productId}` 
        : `/api/products/${productId}`;
      
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...productData,
          shippingProfile: productData.shippingProfile?.trim() ? productData.shippingProfile : null,
          tokshow: productData.tokshow && productData.tokshow !== "no-show" ? productData.tokshow : null,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-products"] });
      queryClient.invalidateQueries({ queryKey: ["external-product", productId] });
      toast({
        title: "Product Updated",
        description: "Your product has been updated successfully.",
      });
      navigate("/inventory");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    updateProductMutation.mutate(data);
  };

  if (!productId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Invalid Product ID</h1>
          <p className="text-muted-foreground mt-2">No product ID provided.</p>
          <Button onClick={() => navigate("/inventory")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  if (loadingProduct) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Product Not Found</h1>
          <p className="text-muted-foreground mt-2">The product you're trying to edit doesn't exist.</p>
          <Button onClick={() => navigate("/inventory")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const categories = categoriesResponse?.categories || [];
  const shippingProfiles = shippingProfilesResponse || [];
  const shows = showsResponse?.rooms || [];

  return (
    <div className="p-3 sm:p-6 space-y-6" data-testid="page-edit-product">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate("/inventory")}
          data-testid="button-back-to-inventory"
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="sm:inline">Back to Inventory</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
            Edit Product
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-page-description">
            Update product information: {product.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Essential product details and description
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter product name" 
                            {...field} 
                            data-testid="input-product-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter product description" 
                            {...field} 
                            rows={4}
                            data-testid="textarea-product-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Inventory</CardTitle>
                  <CardDescription>
                    Set your product price and stock levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                              data-testid="input-product-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="0" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                              data-testid="input-product-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Product Images Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                  <CardDescription>
                    Upload images of your product (up to 5 images)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploader
                            value={field.value || []}
                            onChange={field.onChange}
                            maxFiles={5}
                            maxFileSize={5 * 1024 * 1024} // 5MB
                            disabled={updateProductMutation.isPending}
                            allowFileStorage={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Side Column */}
            <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-6 self-start">
              <Card>
                <CardHeader>
                  <CardTitle>Category & Listing</CardTitle>
                  <CardDescription>
                    Categorize your product and set listing type
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={loadingCategories}
                          data-testid="select-product-category"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="skip">No Category</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category._id} value={category._id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Profile</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                          disabled={loadingShippingProfiles}
                          data-testid="select-shipping-profile"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shipping profile" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="skip">No Shipping Profile</SelectItem>
                            {shippingProfiles.map((profile) => (
                              <SelectItem key={profile._id} value={profile._id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tokshow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Show</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || "no-show"}
                          disabled={loadingShows}
                          data-testid="select-show"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select show" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no-show">No Show</SelectItem>
                            {shows.map((show) => (
                              <SelectItem key={show._id} value={show._id}>
                                {show.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign this product to a live show or select "No Show" to remove it from any show
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="listingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing Type *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          data-testid="select-listing-type"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select listing type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="buy_now">Buy Now</SelectItem>
                            <SelectItem value="auction">Auction</SelectItem>
                            <SelectItem value="giveaway">Giveaway</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how customers can purchase this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Featured Product</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value ? "true" : "false"}
                            className="flex flex-col space-y-1"
                            data-testid="radio-group-featured"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="featured-false" data-testid="radio-featured-false" />
                              <FormLabel htmlFor="featured-false" className="text-sm font-normal">
                                No
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="featured-true" data-testid="radio-featured-true" />
                              <FormLabel htmlFor="featured-true" className="text-sm font-normal">
                                Yes
                              </FormLabel>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Mark this product as featured to highlight it
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/inventory")}
              data-testid="button-cancel"
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateProductMutation.isPending}
              data-testid="button-save-product"
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProductMutation.isPending ? "Updating..." : "Update Product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}