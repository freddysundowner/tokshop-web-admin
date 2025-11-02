import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { uploadShowThumbnail } from "@/lib/upload-images";

const scheduleShowSchema = z.object({
  title: z.string().min(1, "Show title is required"),
  scheduledAt: z.string().min(1, "Date and time is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  
  // Shipping Settings
  freePickup: z.boolean().default(false),
  uspsPriorityMail: z.boolean().default(false),
  uspsGroundAdvantage: z.boolean().default(false),
  shippingProfile: z.string().optional(),
  shippingCoverage: z.enum(["seller_pays", "buyer_pays_max", "buyer_pays_all"]),
  maxBuyerPays: z.string().optional(),
  
  // Content Settings
  roomType: z.enum(["public", "private"]),
  explicitContent: z.boolean().default(false),
  
  // Repeat Settings
  repeatShow: z.enum(["none", "daily", "weekly", "monthly"]),
  repeatCount: z.string().optional(),
});

type ScheduleShowFormData = z.infer<typeof scheduleShowSchema>;

export default function ScheduleShow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [domesticShipmentsExpanded, setDomesticShipmentsExpanded] = useState(false);
  const [shippingCostsExpanded, setShippingCostsExpanded] = useState(false);

  // Get edit ID from URL query params
  const editShowId = new URLSearchParams(window.location.search).get('edit');
  const isEditMode = !!editShowId;

  // Fetch show data if in edit mode
  const { data: showData, isLoading: loadingShowData } = useQuery({
    queryKey: ['/api/rooms', editShowId],
    queryFn: async () => {
      if (!editShowId) return null;
      const response = await fetch(`/api/rooms/${editShowId}`);
      if (!response.ok) throw new Error('Failed to fetch show');
      return response.json();
    },
    enabled: isEditMode,
  });

  // Fetch real categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories?status=active&page=1&limit=100');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });
  
  // Flatten categories to include subcategories
  const categories = useMemo(() => {
    if (!categoriesData?.categories) return [];
    
    const flattened: any[] = [];
    categoriesData.categories.forEach((category: any) => {
      // Add parent category
      flattened.push(category);
      
      // Add subcategories if they exist
      if (category.subCategories && Array.isArray(category.subCategories) && category.subCategories.length > 0) {
        flattened.push(...category.subCategories);
      }
    });
    
    console.log('📦 Flattened categories:', flattened.map((c: any) => ({ id: c._id, name: c.name })));
    return flattened;
  }, [categoriesData]);

  // Fetch real shipping profiles
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

  const form = useForm<ScheduleShowFormData>({
    resolver: zodResolver(scheduleShowSchema),
    defaultValues: {
      title: "",
      scheduledAt: "",
      category: "",
      description: "",
      freePickup: false,
      uspsPriorityMail: false,
      uspsGroundAdvantage: false,
      shippingProfile: "",
      shippingCoverage: "buyer_pays_all",
      maxBuyerPays: "",
      roomType: "public",
      explicitContent: false,
      repeatShow: "none",
      repeatCount: "",
    },
  });

  // Populate form when show data is loaded (edit mode)
  // Wait for categories and shipping profiles to load before populating
  useEffect(() => {
    if (showData && isEditMode && !categoriesLoading && !loadingShippingProfiles) {
      console.log('📝 Populating form with show data:', showData);
      console.log('📦 Categories loaded:', categoriesData?.categories?.length);
      console.log('📦 Shipping profiles loaded:', shippingProfilesResponse?.length);
      
      // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
      const scheduledDate = new Date(showData.date);
      const formattedDate = scheduledDate.toISOString().slice(0, 16);
      
      // Get shipping settings with fallbacks
      const shippingSettings = showData.shipping_settings || {};
      
      console.log('🚚 Shipping settings from API:', shippingSettings);
      
      // Determine shipping coverage mode using exact database field names
      let shippingCoverage: "seller_pays" | "buyer_pays_max" | "buyer_pays_all" = "buyer_pays_all";
      if (shippingSettings.shippingCostMode) {
        shippingCoverage = shippingSettings.shippingCostMode;
      } else if (shippingSettings.seller_pays) {
        shippingCoverage = "seller_pays";
      } else if (shippingSettings.reducedShippingCapAmount > 0) {
        shippingCoverage = "buyer_pays_max";
      }
      
      console.log('🚚 Calculated shipping coverage:', shippingCoverage);
      
      // Extract category ID from object or string
      const categoryId = typeof showData.category === 'object' 
        ? (showData.category as any)?._id || (showData.category as any)?.id || ""
        : showData.category || "";
      
      console.log('📌 Category value:', { raw: showData.category, extracted: categoryId });
      console.log('📌 Available categories:', categories.map((c: any) => ({ id: c._id, name: c.name })));
      
      // Check if category exists in available categories
      const categoryExists = categories.some((c: any) => c._id === categoryId);
      console.log('📌 Category exists in list?', categoryExists);

      // Use setTimeout to ensure Select components are mounted
      setTimeout(() => {
        // Set individual values for better Select component support
        form.setValue("title", showData.title || "");
        form.setValue("scheduledAt", formattedDate);
        form.setValue("category", categoryId);
        console.log('📌 After setValue, form.getValues("category"):', form.getValues("category"));
        form.setValue("description", showData.description || "");
        // Use exact database field names
        form.setValue("freePickup", !!shippingSettings.freePickupEnabled);
        form.setValue("uspsPriorityMail", !!shippingSettings.priorityMailEnabled);
        form.setValue("uspsGroundAdvantage", !!shippingSettings.groundAdvantageEnabled);
        form.setValue("shippingProfile", shippingSettings.shippingProfile || "");
        
        console.log('🚚 Set shipping values:', {
          freePickup: !!shippingSettings.freePickupEnabled,
          uspsPriorityMail: !!shippingSettings.priorityMailEnabled,
          uspsGroundAdvantage: !!shippingSettings.groundAdvantageEnabled,
          shippingProfile: shippingSettings.shippingProfile
        });
        form.setValue("shippingCoverage", shippingCoverage);
        form.setValue("maxBuyerPays", shippingSettings.reducedShippingCapAmount ? String(shippingSettings.reducedShippingCapAmount) : "");
        form.setValue("roomType", showData.roomType || "public");
        form.setValue("explicitContent", showData.explicit_content || false);
        form.setValue("repeatShow", showData.repeat || "none");
        form.setValue("repeatCount", showData.repeat_count ? String(showData.repeat_count) : "");
        
        // Preserve existing thumbnail URL if exists
        if (showData.thumbnail) {
          form.setValue("thumbnail", showData.thumbnail);
          setThumbnailPreview(showData.thumbnail);
        }
        
        console.log('✅ Form values set with category:', categoryId);
      }, 100);
    }
  }, [showData, isEditMode, form, categoriesLoading, loadingShippingProfiles, categories, shippingProfilesResponse]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const showId = editShowId || `show_${Date.now()}`;
      const imageUrl = await uploadShowThumbnail(file, showId);
      
      form.setValue("thumbnail", imageUrl);
      console.log('📸 Image uploaded to Firebase:', imageUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Thumbnail uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      // Clear preview on error
      setThumbnailPreview(null);
      form.setValue("thumbnail", "");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeThumbnail = () => {
    setThumbnailPreview(null);
    form.setValue("thumbnail", "");
  };

  const onSubmit = async (data: ScheduleShowFormData) => {
    try {
      if (!user?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to schedule a show.",
          variant: "destructive",
        });
        return;
      }

      // Convert scheduled date to timestamp
      const scheduledDate = new Date(data.scheduledAt);
      const dateTimestamp = scheduledDate.getTime();

      // Build shipping settings object with exact database field names
      const shippingSettings = {
        priorityMailEnabled: data.uspsPriorityMail,
        groundAdvantageEnabled: data.uspsGroundAdvantage,
        shippingCostMode: data.shippingCoverage,
        reducedShippingCapAmount: data.maxBuyerPays ? parseFloat(data.maxBuyerPays) : 0,
        buyer_pays: data.shippingCoverage === "buyer_pays_all" || data.shippingCoverage === "buyer_pays_max",
        seller_pays: data.shippingCoverage === "seller_pays",
        freePickupEnabled: data.freePickup,
        shippingProfile: data.shippingProfile || null,
      };

      // Build the room data matching the Flutter structure
      const roomData = {
        title: data.title,
        roomType: data.roomType,
        userId: user.id,
        category: data.category,
        activeTime: Date.now(), // Current timestamp
        status: true,
        repeat: data.repeatShow,
        repeat_count: data.repeatCount ? parseInt(data.repeatCount) : 0,
        date: dateTimestamp,
        shipping_settings: shippingSettings,
        explicit_content: data.explicitContent,
        description: data.description || "",
        thumbnail: data.thumbnail || "",
      };

      if (isEditMode && editShowId) {
        // Update existing show
        console.log("Updating show with data:", roomData);

        const response = await fetch(`/api/rooms/${editShowId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update show");
        }

        const result = await response.json();
        console.log("Show updated successfully:", result);

        // Invalidate cache to refresh the shows list
        await queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });

        toast({
          title: "Show Updated Successfully",
          description: `Your show "${data.title}" has been updated.`,
        });
      } else {
        // Create new show
        console.log("Creating show with data:", roomData);

        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create show");
        }

        const result = await response.json();
        console.log("Show created successfully:", result);

        // Invalidate cache to refresh the shows list
        await queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });

        toast({
          title: "Show Scheduled Successfully",
          description: `Your show "${data.title}" has been scheduled.`,
        });
      }

      // Navigate to live shows page
      setLocation("/live-shows");
    } catch (error) {
      console.error("Error creating show:", error);
      toast({
        title: "Failed to Schedule Show",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const shippingCoverage = form.watch("shippingCoverage");
  const repeatShow = form.watch("repeatShow");

  const shippingProfiles = shippingProfilesResponse || [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/live-shows")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-schedule-show-title">
              {isEditMode ? "Edit Show" : "Schedule a Show"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? "Update your show details and settings" : "Set up your live selling show with shipping and content settings"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Row 1: Basic Information (Left) & Shipping Settings (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Core details about your show
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Show Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., $100 in giveaways. $1 pre-loved Lululemon"
                            {...field}
                            data-testid="input-show-title"
                          />
                        </FormControl>
                        <FormDescription>
                          Make it descriptive to tell viewers what you're selling
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="input-scheduled-at"
                          />
                        </FormControl>
                        <FormDescription>
                          Schedule 1 week in advance for maximum bookmarks
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => {
                      console.log('🎯 Category field.value:', field.value);
                      return (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : categoriesData?.categories && categoriesData.categories.length > 0 ? (
                              <>
                                {categoriesData.categories.map((category: any) => [
                                  /* Parent Category */
                                  <SelectItem key={category._id || category.id} value={category._id || category.id} className="font-semibold">
                                    {category.name}
                                  </SelectItem>,
                                  
                                  /* Subcategories with indentation */
                                  ...(category.subCategories && category.subCategories.length > 0 
                                    ? category.subCategories.map((subCategory: any) => (
                                        <SelectItem 
                                          key={subCategory._id || subCategory.id} 
                                          value={subCategory._id || subCategory.id}
                                          className="pl-6"
                                        >
                                          ↳ {subCategory.name}
                                        </SelectItem>
                                      ))
                                    : []
                                  )
                                ])}
                              </>
                            ) : (
                              <SelectItem value="none" disabled>No categories available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Helps buyers discover your show
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>

                {/* Shipping Settings */}
                <Card>
                <CardHeader>
                  <CardTitle>Shipping Settings</CardTitle>
                  <CardDescription>
                    Adjust your defaults for domestic shipments, shipping costs, and local pickup for this show
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipping Profile */}
                  <FormField
                    control={form.control}
                    name="shippingProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Profile</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={loadingShippingProfiles}
                          data-testid="select-shipping-profile"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shipping profile" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            <SelectItem value="skip">No Shipping Profile</SelectItem>
                            {shippingProfiles.map((profile: any) => (
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

                  {/* Free Pickup Toggle */}
                  <FormField
                    control={form.control}
                    name="freePickup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Free pickup</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-free-pickup"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Domestic Shipments - Expandable */}
                  <div className="rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setDomesticShipmentsExpanded(!domesticShipmentsExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      data-testid="button-domestic-shipments"
                    >
                      <div className="text-left">
                        <div className="font-semibold text-sm">Domestic Shipments</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          All orders falling outside of your shipping preferences will default to USPS Ground Advantage. Eligible sellers will default to Media Mail shipping.
                        </p>
                      </div>
                      {domesticShipmentsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </button>
                    
                    {domesticShipmentsExpanded && (
                      <div className="p-4 pt-0 border-t border-border space-y-3">
                        {/* USPS Priority Mail */}
                        <FormField
                          control={form.control}
                          name="uspsPriorityMail"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-semibold">USPS Priority Mail</FormLabel>
                                <FormDescription className="text-xs">
                                  Arrives in 1-3 business days. Best for time-sensitive shipments.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-usps-priority"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* USPS Ground Advantage */}
                        <FormField
                          control={form.control}
                          name="uspsGroundAdvantage"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-semibold">USPS Ground Advantage</FormLabel>
                                <FormDescription className="text-xs">
                                  Best for shipping heavier items that aren't time-sensitive.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-usps-ground"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Shipping Costs - Expandable */}
                  <div className="rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setShippingCostsExpanded(!shippingCostsExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      data-testid="button-shipping-costs"
                    >
                      <div className="text-left">
                        <div className="font-semibold text-sm">Shipping Costs</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Costs calculated based on buyer's location and shipment weight. Only applies to shipments within the contiguous U.S.
                        </p>
                      </div>
                      {shippingCostsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </button>
                    
                    {shippingCostsExpanded && (
                      <div className="p-4 pt-0 border-t border-border">
                        <FormField
                          control={form.control}
                          name="shippingCoverage"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex flex-col space-y-3"
                                >
                                  {/* Seller pays all */}
                                  <FormItem className="flex flex-col space-y-2 rounded-lg border border-border p-3">
                                    <div className="flex items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="seller_pays" data-testid="radio-seller-pays" className="mt-1" />
                                      </FormControl>
                                      <div className="flex-1">
                                        <FormLabel className="font-semibold cursor-pointer">
                                          Seller pays all shipping costs
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          This only applies to domestic orders. Buyers have to pay for shipping on international orders.
                                        </p>
                                      </div>
                                    </div>
                                  </FormItem>

                                  {/* Buyer pays up to max */}
                                  <FormItem className="flex flex-col space-y-2 rounded-lg border border-border p-3">
                                    <div className="flex items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="buyer_pays_max" data-testid="radio-buyer-pays-max" className="mt-1" />
                                      </FormControl>
                                      <div className="flex-1">
                                        <FormLabel className="font-semibold cursor-pointer">
                                          Buyer pays up to a set shipping cost
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Set a maximum shipping cost buyers will pay for unlimited orders within your show.
                                        </p>
                                      </div>
                                    </div>
                                    {shippingCoverage === "buyer_pays_max" && (
                                      <div className="ml-9 mt-2">
                                        <FormField
                                          control={form.control}
                                          name="maxBuyerPays"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm">Amount</FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="e.g., 9.21"
                                                  {...field}
                                                  data-testid="input-max-buyer-pays"
                                                  className="max-w-[200px]"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    )}
                                  </FormItem>

                                  {/* Buyer pays all */}
                                  <FormItem className="flex flex-col space-y-2 rounded-lg border border-border p-3">
                                    <div className="flex items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="buyer_pays_all" data-testid="radio-buyer-pays-all" className="mt-1" />
                                      </FormControl>
                                      <div className="flex-1">
                                        <FormLabel className="font-semibold cursor-pointer">
                                          Buyer pays all shipping costs
                                        </FormLabel>
                                      </div>
                                    </div>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
                </Card>
              </div>

              {/* Row 2: Thumbnail & Description */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail/Cover Photo</CardTitle>
                    <CardDescription>
                      Upload an eye-catching image or video
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="thumbnail"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-4">
                              {thumbnailPreview ? (
                                <div className="relative w-full max-w-[180px]">
                                  <img
                                    src={thumbnailPreview}
                                    alt="Thumbnail preview"
                                    className="w-full aspect-[9/16] object-cover rounded-lg border border-border"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={removeThumbnail}
                                    data-testid="button-remove-thumbnail"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                  <Label
                                    htmlFor="thumbnail-upload"
                                    className={`cursor-pointer text-primary hover:underline ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    {uploadingImage ? 'Uploading to Firebase...' : 'Click to upload thumbnail'}
                                  </Label>
                                  <Input
                                    id="thumbnail-upload"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleThumbnailUpload}
                                    className="hidden"
                                    data-testid="input-thumbnail"
                                    disabled={uploadingImage}
                                  />
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Recommended: 1080x1920px (9:16 ratio)
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Video thumbnails enable Instagram sharing
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                    <CardDescription>
                      Add more details about your show
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Add more details about what you'll be selling..."
                              {...field}
                              className="min-h-[200px]"
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Content Settings & Repeat Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Content Settings */}
                <Card>
                <CardHeader>
                  <CardTitle>Content Settings</CardTitle>
                  <CardDescription>
                    Control show visibility and moderation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="public" data-testid="radio-public" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Public - Visible to everyone
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="private" data-testid="radio-private" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Private - Only accessible via share link (no notifications)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Use private mode for test shows or practice runs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="explicitContent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Explicit Content
                          </FormLabel>
                          <FormDescription>
                            Toggle if strong language will be used
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-explicit-content"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

                {/* Repeat Settings */}
                <Card>
                <CardHeader>
                  <CardTitle>Repeat Settings</CardTitle>
                  <CardDescription>
                    Schedule recurring shows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="repeatShow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Frequency *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="none" data-testid="radio-none" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                No repeat (one-time show)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="daily" data-testid="radio-daily" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Daily
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="weekly" data-testid="radio-weekly" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Weekly
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="monthly" data-testid="radio-monthly" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Monthly
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {repeatShow !== "none" && (
                    <FormField
                      control={form.control}
                      name="repeatCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Occurrences</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 4"
                              {...field}
                              data-testid="input-repeat-count"
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty to repeat indefinitely
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                </Card>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/live-shows")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-schedule">
                  {isEditMode ? "Update Show" : "Schedule Show"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
