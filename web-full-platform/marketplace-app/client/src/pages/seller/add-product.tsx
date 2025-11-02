import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { ArrowLeft, Save, X, Plus, Check } from "lucide-react";
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
  type IconaCategoriesResponse,
  type IconaShippingProfilesResponse,
} from "@shared/schema";

export default function AddProduct() {
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
    },
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
  const { data: shippingProfilesResponse, isLoading: loadingShippingProfiles } = useQuery<any[]>({
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

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await fetch(`/api/products/${user?.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-products"] });
      toast({
        title: "Product Created",
        description: "Your product has been created successfully.",
      });
      navigate("/inventory");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  const categories = categoriesResponse?.categories || [];
  const shippingProfiles = shippingProfilesResponse || [];

  return (
    <div className="p-3 sm:p-6 space-y-6" data-testid="page-add-product">
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
            Add New Product
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-page-description">
            Create a new product for your inventory
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
                            disabled={createProductMutation.isPending}
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
                          defaultValue={field.value}
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

                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Shipping</CardTitle>
                  <CardDescription>
                    Configure shipping preferences for this product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="shippingProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Profile</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value || ""}
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
                    name="listingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing Type *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
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
              disabled={createProductMutation.isPending}
              data-testid="button-save-product"
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {createProductMutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}