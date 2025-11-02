import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userName: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone === '') return true; // Optional field
    // Basic phone validation: at least 10 digits, can contain +, spaces, dashes, parentheses
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[0-9]{3}[)]?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4,6}$|^[\+]?[0-9]{8,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }, "Please enter a valid phone number"),
  country: z.string().min(1, "Country is required"),
});

export const socialAuthSchema = z.object({
  email: z.string().optional(), // Apple might not provide email initially
  firstName: z.string().optional(), // Apple might not provide name initially
  lastName: z.string().optional(),
  type: z.enum(["google", "apple"], { errorMap: () => ({ message: "Auth type must be 'google' or 'apple'" }) }),
  profilePhoto: z.string().optional(),
  userName: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  uid: z.string().optional(), // Firebase UID (will be overridden by verified UID)
  idToken: z.string().min(1, "Firebase ID token is required for authentication"), // Required for verification
  provider: z.string().optional(), // Firebase provider info
  profilePicture: z.string().optional(), // Profile picture URL
}).refine((data) => {
  // For Google, require email and firstName
  if (data.type === 'google') {
    return !!data.email && !!data.firstName;
  }
  // For Apple, we'll handle missing fields in the completion flow
  return true;
}, {
  message: "Google authentication requires email and first name",
  path: ["firstName"]
});

export const socialAuthCompleteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userName: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional().refine((phone) => {
    if (!phone || phone === '') return true; // Optional field
    // Basic phone validation: at least 10 digits, can contain +, spaces, dashes, parentheses
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[0-9]{3}[)]?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4,6}$|^[\+]?[0-9]{8,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }, "Please enter a valid phone number"),
  gender: z.string().optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type SocialAuthData = z.infer<typeof socialAuthSchema>;
export type SocialAuthCompleteData = z.infer<typeof socialAuthCompleteSchema>;

export const authResponseSchema = z.object({
  token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
  }).optional(),
  message: z.string().optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Icona API authentication response types
export const iconaAuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any(), // User data from Icona API
  accessToken: z.string().optional(),
  authtoken: z.string().optional(), // Also returned by API
  newuser: z.boolean().optional(), // For signup responses
});

export const iconaApiErrorResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string(),
  error: z.string().optional(),
  details: z.any().optional(),
});

export type IconaAuthResponse = z.infer<typeof iconaAuthResponseSchema>;
export type IconaApiErrorResponse = z.infer<typeof iconaApiErrorResponseSchema>;

// Icona API Response types
export const iconaOrderSchema = z.object({
  _id: z.string(),
  customer: z.object({
    _id: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
    userName: z.string().optional(),
    email: z.string(),
    profilePhoto: z.string().optional(),
    address: z.object({
      _id: z.string(),
      name: z.string(),
      addrress1: z.string(),
      city: z.string(),
      state: z.string(),
      zipcode: z.string(),
      phone: z.string(),
      email: z.string(),
    }).optional(),
  }),
  seller: z.object({
    _id: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
    userName: z.string().optional(),
    email: z.string(),
  }),
  need_label: z.boolean(),
  giveaway: z.object({
    _id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number(),
    images: z.array(z.string()).optional(),
    category: z.object({
      _id: z.string(),
      name: z.string(),
    }).optional(),
    shipping_profile: z.object({
      _id: z.string(),
      weight: z.number(),
      name: z.string(),
      scale: z.string(),
    }).optional(),
    height: z.string().optional(),
    width: z.string().optional(),
    length: z.string().optional(),
    status: z.string().optional(),
    participants: z.array(z.string()).optional(),
  }).optional(),
  // Order type and items
  ordertype: z.string().optional(),
  items: z.array(z.object({
    _id: z.string().optional(),
    orderId: z.string().optional(),
    productId: z.object({
      _id: z.string().optional(),
      name: z.string().optional(),
      images: z.array(z.string()).optional(),
      category: z.object({
        _id: z.string().optional(),
        name: z.string().optional(),
      }).optional(),
    }).optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    shipping_fee: z.number().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    width: z.string().optional(),
    length: z.string().optional(),
    scale: z.string().optional(),
  })).optional(),
  // Financial fields
  total: z.number().optional(), // Items total/subtotal amount
  servicefee: z.number().optional(),
  tax: z.number().optional(),
  shipping_fee: z.number().optional(),
  seller_shipping_fee_pay: z.number().optional(), // Seller's shipping cost (always use this for total shipping)
  total_shipping_cost: z.number().optional(), // Total shipping cost for bundle
  invoice: z.number().optional(),
  // Status and tracking
  status: z.string().optional(),
  tracking_number: z.string().optional(),
  label: z.string().optional(),
  weight: z.union([z.number(), z.string()]).optional(), // Order weight
  // Dates  
  date: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  // Bundling
  bundleId: z.string().optional().nullable(),
  // Show/Room association
  tokshow: z.object({
    _id: z.string(),
    title: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  scale: z.string().optional(),
});

export const iconaOrdersResponseSchema = z.object({
  orders: z.array(iconaOrderSchema),
  limits: z.number(),
  pages: z.number(),
  total: z.number(),
});

export type IconaOrder = z.infer<typeof iconaOrderSchema>;
export type IconaOrdersResponse = z.infer<typeof iconaOrdersResponseSchema>;

export const iconaDashboardResponseSchema = z.object({
  totalOrder: z.number(),
  totalAmount: z.string(),
  todayOrder: z.array(z.any()),
  totalAmountOfThisMonth: z.string(),
  totalPendingOrder: z.object({
    total: z.number(),
    count: z.number(),
  }).optional(),
  totalDeliveredOrder: z.number(),
  orders: z.array(z.any()),
  weeklySaleReport: z.array(z.any()),
});

export type IconaDashboardResponse = z.infer<typeof iconaDashboardResponseSchema>;

// Icona Product API Response types
export const iconaProductSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
  images: z.array(z.string()).optional(),
  category: z.object({
    _id: z.string(),
    name: z.string(),
  }).optional(),
  seller: z.object({
    _id: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
    userName: z.string().optional(),
    email: z.string(),
  }),
  status: z.string().optional(),
  weight: z.union([z.number(), z.string()]).optional(),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  scale: z.string().optional(),
  shipping_profile: z.object({
    _id: z.string(),
    weight: z.number(),
    name: z.string(),
    scale: z.string(),
  }).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const iconaProductsResponseSchema = z.object({
  products: z.array(iconaProductSchema),
  limits: z.number(),
  pages: z.number(),
  totalDoc: z.number(),
});

export type IconaProduct = z.infer<typeof iconaProductSchema>;
export type IconaProductsResponse = z.infer<typeof iconaProductsResponseSchema>;

// External API Category schema
export const iconaCategorySchema: z.ZodType<any> = z.lazy(() => z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  icon: z.string().optional(),
  type: z.string().optional(),
  subCategories: z.array(iconaCategorySchema).optional(),
}));

export const iconaCategoriesResponseSchema = z.object({
  categories: z.array(iconaCategorySchema),
  limits: z.number().optional(),
  pages: z.number().optional(),
  total: z.number().optional(),
});

export type IconaCategory = z.infer<typeof iconaCategorySchema>;
export type IconaCategoriesResponse = z.infer<typeof iconaCategoriesResponseSchema>;

// External API Shipping Profile schema
export const iconaShippingProfileSchema = z.object({
  _id: z.string(),
  name: z.string(),
  weight: z.number(),
  scale: z.string(),
  description: z.string().optional(),
});

export const iconaShippingProfilesResponseSchema = z.array(iconaShippingProfileSchema);

export type IconaShippingProfile = z.infer<typeof iconaShippingProfileSchema>;
export type IconaShippingProfilesResponse = z.infer<typeof iconaShippingProfilesResponseSchema>;

// Product form schemas
export const listingTypeSchema = z.enum(['auction', 'buy_now', 'giveaway']);

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number({ invalid_type_error: "Quantity is required" }).int().min(1, "Quantity must be at least 1"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(['active', 'inactive', 'out_of_stock', 'draft']).optional().default('active'),
  listingType: listingTypeSchema,
  shippingProfile: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  // Auction-specific fields
  startingPrice: z.coerce.number().optional().nullable(),
  duration: z.coerce.number().int().optional().nullable(),
  sudden: z.boolean().optional().default(false),
  // Buy Now-specific fields
  featured: z.boolean().optional().default(false),
  // Giveaway-specific fields
  whocanenter: z.enum(['everyone', 'followers']).optional().default('everyone'),
  // Room association
  tokshow: z.string().optional(),
}).refine((data) => {
  // For auction, startingPrice and duration are required
  if (data.listingType === 'auction') {
    return data.startingPrice !== undefined && data.startingPrice !== null && data.startingPrice > 0;
  }
  return true;
}, {
  message: "Starting price must be greater than 0",
  path: ["startingPrice"],
}).refine((data) => {
  // For auction, duration is required
  if (data.listingType === 'auction') {
    return data.duration !== undefined && data.duration !== null && data.duration > 0;
  }
  return true;
}, {
  message: "Duration must be selected",
  path: ["duration"],
}).refine((data) => {
  // For buy_now, price is required
  if (data.listingType === 'buy_now') {
    return data.price !== undefined && data.price !== null && data.price > 0;
  }
  return true;
}, {
  message: "Price must be greater than 0",
  path: ["price"],
});

export type ListingType = z.infer<typeof listingTypeSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;

// Computed Bundle type (not persisted in DB)
export const bundleSchema = z.object({
  id: z.string(), // Generated hash from sorted orderIds
  customerId: z.string(),
  customerName: z.string(),
  orderIds: z.array(z.string()),
  count: z.number(),
  weight: z.string().optional(), // Aggregated weight
  dimensions: z.string().optional(), // Aggregated dimensions  
  totalValue: z.number(), // Sum of order totals
  status: z.enum(["pending", "labeled"]).optional().default("pending"),
  createdAt: z.string().optional(),
});

export type Bundle = z.infer<typeof bundleSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  seller: boolean("seller").default(false),
  admin: boolean("admin").default(false),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  itemName: text("item_name").notNull(),
  itemCount: integer("item_count").notNull().default(1),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  weight: text("weight"),
  dimensions: text("dimensions"),
  status: text("status").notNull(), // unfulfilled, shipping, delivered, cancelled, pickup
  createdAt: timestamp("created_at").defaultNow().notNull(),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  trackingNumber: text("tracking_number"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0"),
  bundleId: varchar("bundle_id"),
});

export const shipmentBundles = pgTable("shipment_bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bundleName: text("bundle_name").notNull(),
  totalWeight: text("total_weight"),
  totalDimensions: text("total_dimensions"),
  trackingNumber: text("tracking_number"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  shippedAt: timestamp("shipped_at"),
});

export const liveShows = pgTable("live_shows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull(), // draft, scheduled, live, ended, cancelled
  category: text("category").notNull(),
  thumbnail: text("thumbnail"),
  viewerCount: integer("viewer_count").default(0),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0"),
  hostId: varchar("host_id").notNull(),
});

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  buyerCount: integer("buyer_count").notNull(),
  showCount: integer("show_count").notNull(),
  avgShippingTime: decimal("avg_shipping_time", { precision: 4, scale: 2 }),
  cancellationRate: decimal("cancellation_rate", { precision: 5, scale: 2 }),
  satisfactionRating: decimal("satisfaction_rating", { precision: 3, scale: 2 }),
});

export const shippingProfiles = pgTable("shipping_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  freeShippingThreshold: decimal("free_shipping_threshold", { precision: 10, scale: 2 }),
  bundleEnabled: boolean("bundle_enabled").default(true),
  maxBundleSize: integer("max_bundle_size").default(10),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  addrress1: text("addrress1").notNull(), // Note: keeping the typo as in original schema
  primary: boolean("primary").default(false),
  addrress2: text("addrress2").default(""),
  city: text("city").default(""),
  countryCode: text("country_code").default(""),
  cityCode: text("city_code").default(""),
  state: text("state").default(""),
  stateCode: text("state_code").default(""),
  country: text("country").default(""),
  zipcode: text("zipcode").default(""),
  street: text("street").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertLiveShowSchema = createInsertSchema(liveShows).omit({ id: true });
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true });
export const insertShippingProfileSchema = createInsertSchema(shippingProfiles).omit({ id: true });
export const insertShipmentBundleSchema = createInsertSchema(shipmentBundles).omit({ id: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type LiveShow = typeof liveShows.$inferSelect;
export type InsertLiveShow = z.infer<typeof insertLiveShowSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type ShippingProfile = typeof shippingProfiles.$inferSelect;
export type InsertShippingProfile = z.infer<typeof insertShippingProfileSchema>;
export type ShipmentBundle = typeof shipmentBundles.$inferSelect;
export type InsertShipmentBundle = z.infer<typeof insertShipmentBundleSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

// Address API request/response schemas
export const createAddressSchema = z.object({
  name: z.string().min(1, "Address name is required"),
  addrress1: z.string().min(1, "Street address is required"), // Keep typo as in original schema
  addrress2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().optional().default(""), // Add state code
  cityCode: z.string().optional().default(""), // Add city code (may not always be available)
  zipcode: z.string().min(1, "ZIP code is required"),
  countryCode: z.string().min(1, "Country is required"),
  country: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Please enter a valid email address"),
  userId: z.string().min(1, "User ID is required"),
});

export const updateAddressSchema = createAddressSchema.partial().extend({
  name: z.string().min(1, "Address name is required").optional(),
  addrress1: z.string().min(1, "Street address is required").optional(),
  city: z.string().min(1, "City is required").optional(),
  state: z.string().min(1, "State is required").optional(),
  zipcode: z.string().min(1, "ZIP code is required").optional(),
  countryCode: z.string().min(1, "Country is required").optional(),
  phone: z.string().min(1, "Phone number is required").optional(),
  email: z.string().email("Please enter a valid email address").optional(),
});

export const makePrimaryAddressSchema = z.object({
  primary: z.boolean(),
  userId: z.string().min(1, "User ID is required"),
});

export type CreateAddressRequest = z.infer<typeof createAddressSchema>;
export type UpdateAddressRequest = z.infer<typeof updateAddressSchema>;
export type MakePrimaryAddressRequest = z.infer<typeof makePrimaryAddressSchema>;

// Shipping estimates schema
export const shippingEstimateRequestSchema = z.object({
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.string().optional().default("oz"),
  product: z.string(),
  update: z.boolean().optional().default(true),
  owner: z.string(),
  customer: z.string(),
  length: z.union([z.string(), z.number()]).transform(Number),
  width: z.union([z.string(), z.number()]).transform(Number),
  height: z.union([z.string(), z.number()]).transform(Number),
});

export const shippingEstimateResponseSchema = z.object({
  carrier: z.string(),
  service: z.string(),
  price: z.string(),
  deliveryTime: z.string(),
  objectId: z.string().min(1, "Rate ID is required"), // Rate ID from external API
});

export type ShippingEstimateRequest = z.infer<typeof shippingEstimateRequestSchema>;
export type ShippingEstimateResponse = z.infer<typeof shippingEstimateResponseSchema>;

// Shipping label purchase schemas
export const shippingLabelPurchaseRequestSchema = z.object({
  rate_id: z.string().min(1, "Rate ID is required"),
  order: z.union([z.string(), z.object({
    _id: z.string(),
    customer: z.object({
      _id: z.string(),
      firstName: z.string(),
      lastName: z.string().optional(),
      email: z.string().email(),
      address: z.object({
        name: z.string(),
        addrress1: z.string(),
        city: z.string(),
        state: z.string(),
        zipcode: z.string(),
        phone: z.string(),
        email: z.string().email(),
      }).optional(),
    }),
    seller: z.object({
      _id: z.string(),
      firstName: z.string(),
      lastName: z.string().optional(),
      email: z.string().email(),
    }),
  })]),
  isBundle: z.boolean().optional(), // Add explicit bundle flag
  shipping_fee: z.union([z.string(), z.number()]).transform(Number),
  servicelevel: z.string().min(1, "Service level is required"),
  carrier: z.string().optional(),
  deliveryTime: z.string().optional(),
});

export const shippingLabelPurchaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    tracking_number: z.string(),
    label_url: z.string().optional(),
    label_data: z.string().optional(), // Base64 encoded label
    carrier: z.string(),
    service: z.string(),
    cost: z.string(),
    delivery_time: z.string(),
    purchased_at: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type ShippingLabelPurchaseRequest = z.infer<typeof shippingLabelPurchaseRequestSchema>;
export type ShippingLabelPurchaseResponse = z.infer<typeof shippingLabelPurchaseResponseSchema>;

// Bundle label purchase schemas
export const bundleLabelPurchaseRequestSchema = z.object({
  orderIds: z.array(z.string().min(1, "Order ID cannot be empty")).min(1, "At least one order ID is required"),
  service: z.string().min(1, "Service level is required").optional().default("Ground Advantage"),
  rate_id: z.string().min(1, "Rate ID is required"),
});

export const bundleLabelPurchaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    tracking_number: z.string(),
    label_url: z.string().optional(),
    cost: z.number(),
    carrier: z.string(),
    service: z.string(),
    affected_orders: z.array(z.string()),
    update_results: z.array(z.object({
      orderId: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
      data: z.any().optional(),
    })),
    aggregated_weight: z.string().optional(),
    aggregated_dimensions: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

export type BundleLabelPurchaseRequest = z.infer<typeof bundleLabelPurchaseRequestSchema>;
export type BundleLabelPurchaseResponse = z.infer<typeof bundleLabelPurchaseResponseSchema>;
