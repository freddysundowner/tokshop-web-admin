import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2 } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Switch } from "@/components/ui/switch";
import { uploadImagesToFirebase } from "@/lib/upload-images";
import { useState, useEffect } from "react";
import {
  productFormSchema,
  type ProductFormData,
  type IconaCategoriesResponse,
  type ListingType,
  type IconaCategory,
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Clock } from "lucide-react";

interface ProductFormProps {
  listingType?: ListingType;
  roomId?: string;
  existingProduct?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitButtonText?: string;
  showCancelButton?: boolean;
}

export function ProductForm({
  listingType = 'buy_now',
  roomId,
  existingProduct,
  onSuccess,
  onCancel,
  submitButtonText = "Create Product",
  showCancelButton = false,
}: ProductFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      quantity: 1,
      category: "",
      listingType: listingType,
      shippingProfile: "",
      images: [],
      startingPrice: 1,
      duration: 5,
      sudden: false,
      featured: false,
      whocanenter: 'everyone',
      tokshow: roomId || "",
    },
  });

  // Watch the listing type from the form
  const currentListingType = form.watch('listingType');

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

  // Pre-fill form and images when editing
  useEffect(() => {
    if (existingProduct && !loadingShippingProfiles) {
      console.log('Existing product data:', existingProduct);
      
      // Extract values with proper fallbacks
      const categoryId = existingProduct.category?._id || existingProduct.category || "";
      // Handle both camelCase and snake_case, and extract _id if it's an object
      const shippingProfileData = existingProduct.shippingProfile || existingProduct.shipping_profile;
      const shippingProfileId = typeof shippingProfileData === 'object' && shippingProfileData?._id 
        ? shippingProfileData._id 
        : (typeof shippingProfileData === 'string' ? shippingProfileData : "");
      
      // For auction products, check both top level and auction object
      const productQuantity = existingProduct.quantity || existingProduct.auction?.quantity || 1;
      const productStartingPrice = existingProduct.startingPrice || existingProduct.price || existingProduct.auction?.baseprice || 0;
      const productDuration = existingProduct.auction?.duration || existingProduct.duration || 5;
      const productSudden = existingProduct.auction?.sudden || existingProduct.sudden || false;
      
      console.log('Form values being set:', {
        name: existingProduct.name,
        quantity: productQuantity,
        startingPrice: productStartingPrice,
        duration: productDuration,
        sudden: productSudden,
        shippingProfile: shippingProfileId,
        category: categoryId,
      });
      
      // Reset form with existing product data
      form.reset({
        name: existingProduct.name || "",
        description: existingProduct.description || "",
        price: existingProduct.price || 0,
        quantity: productQuantity,
        category: categoryId,
        listingType: listingType,
        shippingProfile: shippingProfileId,
        images: existingProduct.images || [],
        startingPrice: productStartingPrice,
        duration: productDuration,
        sudden: productSudden,
        tokshow: roomId || existingProduct.tokshow || "",
      });
      
      // Set preview images
      if (existingProduct.images && existingProduct.images.length > 0) {
        setPreviewUrls(existingProduct.images);
      }
    }
  }, [existingProduct, form, listingType, roomId, loadingShippingProfiles]);

  // Create/Update product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const isEditing = !!existingProduct;
      const productId = existingProduct?._id || existingProduct?.id;
      const isGiveaway = productData.listingType === 'giveaway';
      
      let url: string;
      let method: string;
      
      if (isGiveaway) {
        // For giveaways, use the giveaways endpoint
        url = isEditing ? `/api/giveaways/${productId}` : `/api/giveaways`;
        method = isEditing ? "PUT" : "POST";
      } else {
        // For regular products (buy_now, auction)
        url = isEditing 
          ? `/api/products/${productId}` 
          : `/api/products/${user?.id}`;
        method = isEditing ? "PATCH" : "POST";
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} ${isGiveaway ? 'giveaway' : 'product'}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      const isGiveaway = variables.listingType === 'giveaway';
      queryClient.invalidateQueries({ queryKey: ["external-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (isGiveaway) {
        queryClient.invalidateQueries({ queryKey: ["/api/giveaways"] });
      }
      toast({
        title: existingProduct ? (isGiveaway ? "Giveaway Updated" : "Product Updated") : (isGiveaway ? "Giveaway Created" : "Product Created"),
        description: `Your ${isGiveaway ? 'giveaway' : 'product'} has been ${existingProduct ? 'updated' : 'created'} successfully.`,
      });
      if (!existingProduct) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error: Error, variables) => {
      const isGiveaway = variables.listingType === 'giveaway';
      toast({
        title: existingProduct ? (isGiveaway ? "Failed to Update Giveaway" : "Failed to Update Product") : (isGiveaway ? "Failed to Create Giveaway" : "Failed to Create Product"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Upload images to Firebase first if there are any
      let imageUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        setIsUploadingImages(true);
        toast({
          title: "Uploading Images",
          description: "Please wait while we upload your images...",
        });
        
        try {
          // Generate a temporary product ID for Firebase storage path
          const tempProductId = `${user?.id}_${Date.now()}`;
          
          const uploadResults = await uploadImagesToFirebase(selectedFiles, tempProductId);
          imageUrls = uploadResults.map(result => result.url);
        } finally {
          setIsUploadingImages(false);
        }
      }
      
      // Build submit data based on listing type
      const submitData: any = {
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        category: data.category,
        tokshow: data.tokshow,
        images: imageUrls.length > 0 ? imageUrls : (existingProduct?.images || data.images),
        listingType: data.listingType,
      };
      
      // Add type-specific fields
      if (currentListingType === 'buy_now') {
        submitData.price = data.price;
        submitData.shipping_profile = data.shippingProfile;
        submitData.featured = data.featured;
      } else if (currentListingType === 'auction') {
        submitData.startingPrice = data.startingPrice;
        submitData.price = data.startingPrice; // Backend expects price
        submitData.duration = data.duration;
        submitData.sudden = data.sudden;
        submitData.shipping_profile = data.shippingProfile;
      } else if (currentListingType === 'giveaway') {
        submitData.duration = data.duration; // Giveaway duration (in minutes)
        submitData.whocanenter = data.whocanenter;
        submitData.shipping_profile = data.shippingProfile;
      }
      
      console.log('📦 Submitting product data:', {
        listingType: currentListingType,
        quantity: submitData.quantity,
        duration: submitData.duration,
        data: submitData
      });
      
      createProductMutation.mutate(submitData);
    } catch (error) {
      setIsUploadingImages(false);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Display validation errors
  const handleInvalidSubmit = () => {
    const errors = form.formState.errors;
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast({
        title: "Validation Error",
        description: firstError.message as string,
        variant: "destructive",
      });
    }
  };

  const categories = categoriesResponse?.categories || [];
  const shippingProfiles = shippingProfilesResponse || [];

  // Category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<IconaCategory | null>(null);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);

  // Load recent categories on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentCategories');
    if (stored) {
      try {
        setRecentCategories(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent categories:', e);
      }
    }
  }, []);

  // Save category to recent when selected
  const handleCategorySelect = (category: IconaCategory, parentName?: string) => {
    form.setValue('category', category._id);
    
    // Update recent categories
    const updated = [category._id, ...recentCategories.filter(id => id !== category._id)].slice(0, 5);
    setRecentCategories(updated);
    localStorage.setItem('recentCategories', JSON.stringify(updated));
    
    // Close dialog
    setShowCategoryDialog(false);
    setSelectedParentCategory(null);
  };

  // Flatten categories to include subcategories
  const flattenCategories = (cats: any[]): any[] => {
    const result: any[] = [];
    cats.forEach(cat => {
      result.push(cat);
      if (cat.subCategories && cat.subCategories.length > 0) {
        result.push(...cat.subCategories.map((sub: any) => ({ ...sub, parentName: cat.name })));
      }
    });
    return result;
  };

  const allCategories = flattenCategories(categories);
  const recentCategoryItems = recentCategories
    .map(id => allCategories.find(cat => cat._id === id))
    .filter(Boolean);
  
  // Get selected category name
  const selectedCategoryName = allCategories.find(cat => cat._id === form.watch('category'))?.name || allCategories.find(cat => cat._id === form.watch('category'))?.parentName;

  const handleFormSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const isValid = await form.trigger();
    if (isValid) {
      onSubmit(form.getValues());
    } else {
      handleInvalidSubmit();
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleFormSubmit();
        }} 
        className="space-y-3"
      >
        {/* Listing Type Selector */}
        <FormField
          control={form.control}
          name="listingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Listing Type</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange('buy_now')}
                    className={`
                      px-4 py-2.5 rounded-md text-sm font-medium transition-all
                      ${field.value === 'buy_now'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }
                    `}
                    data-testid="button-listing-type-buy-now"
                  >
                    Buy Now
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('auction')}
                    className={`
                      px-4 py-2.5 rounded-md text-sm font-medium transition-all
                      ${field.value === 'auction'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }
                    `}
                    data-testid="button-listing-type-auction"
                  >
                    Auction
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('giveaway')}
                    className={`
                      px-4 py-2.5 rounded-md text-sm font-medium transition-all
                      ${field.value === 'giveaway'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }
                    `}
                    data-testid="button-listing-type-giveaway"
                  >
                    Giveaway
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Product Images - Compact */}
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Product Images</FormLabel>
              <FormControl>
                <div 
                  className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-zinc-600 transition-colors"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e: any) => {
                      const files = Array.from(e.target.files || []) as File[];
                      const newFiles = files.slice(0, 3 - selectedFiles.length);
                      
                      // Store actual file objects
                      const updatedFiles = [...selectedFiles, ...newFiles].slice(0, 3);
                      setSelectedFiles(updatedFiles);
                      
                      // Create preview URLs for display
                      const newUrls = newFiles.map(f => URL.createObjectURL(f));
                      const updatedUrls = [...previewUrls, ...newUrls].slice(0, 3);
                      setPreviewUrls(updatedUrls);
                      
                      // Update form value (will be replaced with Firebase URLs on submit)
                      field.onChange(updatedUrls);
                    };
                    input.click();
                  }}
                >
                  {previewUrls.length > 0 ? (
                    <div className="flex gap-2 flex-wrap justify-center">
                      {previewUrls.map((url: string, idx: number) => (
                        <img key={idx} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                      ))}
                      {previewUrls.length < 3 && (
                        <div className="w-16 h-16 border border-zinc-700 rounded flex items-center justify-center text-zinc-500 text-xs">
                          +
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-zinc-400 text-sm">
                      <div className="mb-1">📷</div>
                      <div>Upload product images</div>
                      <div className="text-xs text-zinc-500 mt-1">JPG, PNG, GIF up to 5MB each</div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Product Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Product Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter product name" 
                  {...field} 
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  data-testid="input-product-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter product description" 
                  {...field} 
                  rows={2}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  data-testid="textarea-product-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Category</FormLabel>
              <FormControl>
                <div
                  onClick={() => setShowCategoryDialog(true)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 cursor-pointer hover:bg-zinc-750 transition-colors"
                  data-testid="button-select-category"
                >
                  {selectedCategoryName || <span className="text-zinc-400">Select category</span>}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Selection Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedParentCategory ? selectedParentCategory.name : 'Select Category'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="max-h-96 overflow-y-auto">
              {!selectedParentCategory ? (
                <div className="space-y-1">
                  {/* Recently Used */}
                  {recentCategoryItems.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Recently Used
                      </div>
                      {recentCategoryItems.map((category: any) => (
                        <button
                          key={`recent-${category._id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCategorySelect(category, category.parentName);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors"
                        >
                          <div className="text-sm text-white">
                            {category.parentName ? `${category.parentName} > ` : ''}{category.name}
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-zinc-800 my-2"></div>
                    </>
                  )}
                  
                  {/* No Category */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.setValue('category', '');
                      setShowCategoryDialog(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <div className="text-sm text-zinc-400">No Category</div>
                  </button>
                  
                  {/* All Categories */}
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (category.subCategories && category.subCategories.length > 0) {
                          setSelectedParentCategory(category);
                        } else {
                          handleCategorySelect(category);
                        }
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors flex items-center justify-between"
                    >
                      <div className="text-sm text-white">{category.name}</div>
                      {category.subCategories && category.subCategories.length > 0 && (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Back button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedParentCategory(null);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors text-sm text-zinc-400"
                  >
                    ← Back
                  </button>
                  
                  {/* Parent category option */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCategorySelect(selectedParentCategory);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <div className="text-sm text-white">{selectedParentCategory.name} (All)</div>
                  </button>
                  
                  <div className="border-t border-zinc-800 my-2"></div>
                  
                  {/* Subcategories */}
                  {selectedParentCategory.subCategories?.map((sub) => (
                    <button
                      key={sub._id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategorySelect(sub, selectedParentCategory.name);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 rounded-md transition-colors"
                    >
                      <div className="text-sm text-white">{sub.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Starting Price / Price */}
        {currentListingType === 'auction' ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-medium">Starting Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="1"
                      placeholder="1.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                      data-testid="input-product-starting-price"
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
                  <FormLabel className="text-white font-medium">Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="1" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                      data-testid="input-product-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : currentListingType === 'buy_now' ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-medium">Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="Price" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
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
                  <FormLabel className="text-white font-medium">Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="1" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                      data-testid="input-product-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : currentListingType === 'giveaway' ? (
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white font-medium">Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="1" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                    data-testid="input-giveaway-quantity"
                  />
                </FormControl>
                <FormDescription className="text-xs text-zinc-400">
                  Number of winners for this giveaway
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {/* Auction-specific: Duration */}
        {currentListingType === 'auction' && (
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white font-medium">Duration</FormLabel>
                <FormControl>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 3, 5, 10, 15, 20, 30].map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => field.onChange(seconds)}
                        className={`
                          w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all
                          ${field.value === seconds 
                            ? 'border-yellow-500 bg-yellow-500 text-black' 
                            : 'border-zinc-700 bg-zinc-800 text-white hover:border-zinc-600'
                          }
                        `}
                        data-testid={`button-duration-${seconds}`}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Shipping Profile */}
        <FormField
          control={form.control}
          name="shippingProfile"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-medium">Shipping Profile</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ""}
                disabled={loadingShippingProfiles}
                data-testid="select-shipping-profile"
              >
                <FormControl>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select shipping profile" className="text-zinc-400" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="z-[10000]">
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

        {/* Auction-specific: Sudden Death */}
        {currentListingType === 'auction' && (
          <FormField
            control={form.control}
            name="sudden"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-700 p-3 bg-zinc-800">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm text-white font-medium">Sudden Death</FormLabel>
                  <FormDescription className="text-xs text-zinc-300">
                    Auction ends immediately when someone bids
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-sudden-death"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Buy Now-specific: Featured */}
        {currentListingType === 'buy_now' && (
          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-700 p-3 bg-zinc-800">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm text-white font-medium">List to trending products</FormLabel>
                  <FormDescription className="text-xs text-zinc-300">
                    This item will be listed to trending products
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-featured"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Giveaway-specific: Duration */}
        {currentListingType === 'giveaway' && (
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white font-medium">Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter duration in minutes"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="input-giveaway-duration"
                  />
                </FormControl>
                <FormDescription className="text-xs text-zinc-400">
                  How long the giveaway will run
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Giveaway-specific: Who Can Enter */}
        {currentListingType === 'giveaway' && (
          <div className="space-y-3">
            <FormLabel className="text-white font-medium">Who can enter</FormLabel>
            <FormField
              control={form.control}
              name="whocanenter"
              render={({ field }) => (
                <>
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-700 p-3 bg-zinc-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-white font-medium">Everyone</FormLabel>
                      <FormDescription className="text-xs text-zinc-300">
                        Everyone can enter this giveaway
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'everyone'}
                        onCheckedChange={(checked) => {
                          if (checked) field.onChange('everyone');
                        }}
                        data-testid="switch-whocanenter-everyone"
                      />
                    </FormControl>
                  </FormItem>
                  
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-700 p-3 bg-zinc-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-white font-medium">Followers</FormLabel>
                      <FormDescription className="text-xs text-zinc-300">
                        Only followers can enter this giveaway
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'followers'}
                        onCheckedChange={(checked) => {
                          if (checked) field.onChange('followers');
                        }}
                        data-testid="switch-whocanenter-followers"
                      />
                    </FormControl>
                  </FormItem>
                </>
              )}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {showCancelButton && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createProductMutation.isPending}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            disabled={createProductMutation.isPending || isUploadingImages}
            onClick={handleFormSubmit}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            data-testid="button-submit-product"
          >
            {(createProductMutation.isPending || isUploadingImages) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isUploadingImages ? "Uploading Images..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
