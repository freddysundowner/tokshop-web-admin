import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";
import { z } from "zod";

// Product creation schema for validation
const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: "Price must be a number" }).positive("Price must be a positive number").optional(),
  quantity: z.coerce.number({ invalid_type_error: "Quantity must be a number" }).int().min(0, "Quantity must be a non-negative integer").optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  listingType: z.enum(["auction", "buy_now", "giveaway"]).optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  scale: z.string().optional(),
  shippingProfile: z.string().optional(),
  images: z.array(z.string()).optional(),
  discountedPrice: z.coerce.number().optional(),
  startingPrice: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  sudden: z.boolean().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  reserved: z.boolean().optional(),
  tokshow: z.union([z.boolean(), z.string(), z.null()]).optional(),
  featured: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

export function registerProductRoutes(app: Express) {
  // Search products endpoint
  app.get("/api/products/search", async (req, res) => {
    try {
      const { q } = req.query;
      console.log("Proxying product search request to Icona API with query:", q);

      if (!q || typeof q !== 'string') {
        return res.json({ products: [] });
      }

      const url = `${ICONA_API_BASE}/products/search?q=${encodeURIComponent(q)}`;
      console.log("Final search API URL being called:", url);

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session?.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      
      // Log user data structure for debugging
      if (data?.results?.users && data.results.users.length > 0) {
        console.log("Sample user from search results:", JSON.stringify(data.results.users[0], null, 2));
      }
      
      res.json(data);
    } catch (error) {
      console.error("Product search proxy error:", error);
      res.status(500).json({ error: "Failed to search products from Icona API", products: [] });
    }
  });

  // Get individual product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(
        "Proxying individual product request to Icona API for product:",
        id,
      );

      // Use the correct endpoint structure for product details
      const url = `${ICONA_API_BASE}/products/products/${id}`;

      console.log("Final API URL being called:", url);

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session?.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Individual product proxy error:", error);
      res.status(500).json({ error: "Failed to fetch product from Icona API" });
    }
  });

  // Products proxy for GET requests (list all products)
  app.get("/api/products", async (req, res) => {
    try {
      console.log("Proxying products request to Icona API");
      console.log("Query params received:", req.query);

      // Build query parameters for Icona API
      const queryParams = new URLSearchParams();

      // Add userId parameter (this is the key parameter for filtering user's products)
      // Check both userId and userid (camelCase and lowercase)
      if (req.query.userId || req.query.userid) {
        queryParams.set("userid", (req.query.userId || req.query.userid) as string);
      }

      // Add roomId parameter (for filtering products by room/show)
      if (req.query.roomId) {
        console.log("Adding roomId to query:", req.query.roomId);
        queryParams.set("roomid", req.query.roomId as string);
      } else {
        console.log("No roomId in query");
      }

      // Add saletype parameter (auction, buy_now, etc.)
      if (req.query.saletype) {
        console.log("Adding saletype to query:", req.query.saletype);
        queryParams.set("saletype", req.query.saletype as string);
      } else {
        console.log("No saletype in query");
      }

      if (req.query.status && req.query.status !== "all") {
        queryParams.set("status", req.query.status as string);
      }
      if (req.query.type) {
        queryParams.set("type", req.query.type as string);
      }
      if (req.query.page) {
        queryParams.set("page", req.query.page as string);
      }
      if (req.query.limit) {
        queryParams.set("limit", req.query.limit as string);
      }
      if (req.query.categoryId) {
        queryParams.set("category", req.query.categoryId as string);
      }
      if (req.query.featured !== undefined) {
        queryParams.set("featured", req.query.featured as string);
      }

      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/products${queryString ? "?" + queryString : ""}`;

      console.log("Final API URL being called:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data: any = await response.json();
      
      // Filter out featured auctions if saletype is auction and featured filter isn't explicitly set
      if (req.query.saletype === 'auction' && req.query.featured === undefined) {
        const products = data.products || data.data || [];
        console.log(`🔍 Total auctions before filtering: ${products.length}`);
        console.log(`🔍 Featured auctions:`, products.filter((p: any) => p.featured === true).map((p: any) => ({ id: p._id, name: p.name, featured: p.featured })));
        
        const nonFeaturedProducts = products.filter((product: any) => product.featured !== true);
        console.log(`🔍 Non-featured auctions after filtering: ${nonFeaturedProducts.length}`);
        
        if (data.products) {
          data.products = nonFeaturedProducts;
        } else if (data.data) {
          data.data = nonFeaturedProducts;
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error("Products proxy error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch products from Icona API" });
    }
  });

  // Create product endpoint
  app.post("/api/products/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log("Creating product via Icona API for user:", userId);
      console.log("Product data received:", req.body);

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Validate the request body
      const validationResult = createProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Validation failed:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({
          error: "Invalid product data",
          details: validationResult.error.errors,
        });
      }

      const productData = validationResult.data;

      // Prepare data for Icona API with correct field mapping
      const iconaProductData = {
        name: productData.name,
        ...(productData.price && { price: productData.price }),
        quantity: productData.quantity,
        userId: userId,
        description: productData.description,
        category: productData.category,
        listing_type: productData.listingType,
        status: productData.status || "draft",
        featured: productData.featured || false,
        // Only include optional fields if they have values (filter out empty strings)
        ...(req.body.images && { images: req.body.images }),
        ...(req.body.discountedPrice && {
          discountedPrice: req.body.discountedPrice,
        }),
        ...(req.body.startingPrice && {
          startingPrice: req.body.startingPrice,
        }),
        ...(req.body.duration && { duration: req.body.duration }),
        ...(req.body.sudden !== undefined && { sudden: req.body.sudden }),
        ...(req.body.colors && { colors: req.body.colors }),
        ...(req.body.sizes && { sizes: req.body.sizes }),
        ...(req.body.reserved !== undefined && { reserved: req.body.reserved }),
        ...(req.body.tokshow !== undefined && { tokshow: req.body.tokshow }),
        ...(req.body.shippingProfile &&
          req.body.shippingProfile.trim() && {
            shipping_profile: req.body.shippingProfile,
          }),
        ...(req.body.weight &&
          req.body.weight.trim() && { weight: req.body.weight }),
        ...(req.body.height &&
          req.body.height.trim() && { height: req.body.height }),
        ...(req.body.width &&
          req.body.width.trim() && { width: req.body.width }),
        ...(req.body.length &&
          req.body.length.trim() && { length: req.body.length }),
        ...(req.body.scale &&
          req.body.scale.trim() && { scale: req.body.scale }),
      };

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      console.log("Session data:", {
        hasSession: !!req.session,
        hasAccessToken: !!req.session?.accessToken,
        tokenPreview: req.session?.accessToken
          ? req.session.accessToken.substring(0, 20) + "..."
          : "NO TOKEN",
      });

      if (req.session?.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
        console.log("Authorization header added");
      } else {
        console.log("WARNING: No access token found in session");
      }

      console.log(
        "Sending to Icona API:",
        JSON.stringify(iconaProductData, null, 2),
      );

      const response = await fetch(`${ICONA_API_BASE}/products/${userId}`, {
        method: "POST",
        headers,
        body: JSON.stringify(iconaProductData),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Product created successfully:", data);
      res.json(data);
    } catch (error: any) {
      console.error("Product creation error:", error);
      res.status(500).json({
        error: "Failed to create product",
        message: error.message || "Unknown error occurred",
      });
    }
  });

  // Bulk add products endpoint
  app.post("/api/products/bulkadd/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log("Bulk adding products via Icona API for user:", userId);
      console.log(
        "Number of products received:",
        req.body.products?.length || 0,
      );

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!req.body.products || !Array.isArray(req.body.products)) {
        return res.status(400).json({ error: "Products array is required" });
      }

      // Validate each product in the array
      const validationErrors: any[] = [];
      const validatedProducts = [];

      for (let i = 0; i < req.body.products.length; i++) {
        const product = req.body.products[i];
        const validationResult = createProductSchema.safeParse(product);

        if (!validationResult.success) {
          validationErrors.push({
            index: i,
            product: product,
            errors: validationResult.error.errors,
          });
        } else {
          validatedProducts.push(validationResult.data);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Invalid product data",
          validationErrors: validationErrors,
        });
      }

      // Prepare products for Icona API
      const iconaProducts = validatedProducts.map((productData) => ({
        name: productData.name,
        price: productData.price,
        quantity: productData.quantity,
        ownerId: userId,
        description: productData.description,
        category: productData.category,
        listing_type: productData.listingType || "buy_now",
        status: productData.status || "active",
        featured: productData.featured || false,
        weight: productData.weight || "",
      }));

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session?.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
        console.log("Authorization header added for bulk upload");
      } else {
        console.log(
          "WARNING: No access token found in session for bulk upload",
        );
      }

      console.log("Sending bulk products to Icona API:", {
        endpoint: `${ICONA_API_BASE}/products/products/bulkadd`,
        productCount: iconaProducts.length,
      });
      
      console.log("Actual payload being sent:", JSON.stringify({ products: iconaProducts }, null, 2));

      const response = await fetch(
        `${ICONA_API_BASE}/products/products/bulkadd`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ products: iconaProducts }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as any;
      console.log("Bulk products created successfully:", {
        successful: data.successful || 0,
        failed: data.failed || 0,
      });
      res.json(data);
    } catch (error: any) {
      console.error("Bulk product creation error:", error);
      res.status(500).json({
        error: "Failed to bulk create products",
        message: error.message || "Unknown error occurred",
      });
    }
  });

  // Update product images endpoint
  app.post("/api/products/images/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      console.log("Updating product images via Icona API:", productId);

      const { images } = req.body;
      if (!images || !Array.isArray(images)) {
        return res.status(400).json({ error: "Images array is required" });
      }

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(
        `${ICONA_API_BASE}/products/images/${productId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ images }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Product images updated successfully:", data);
      res.json(data);
    } catch (error: any) {
      console.error("Product images update error:", error);
      res.status(500).json({
        error: "Failed to update product images",
        message: error.message || "Unknown error occurred",
      });
    }
  });


  // Update product endpoint
  app.patch("/api/products/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      console.log("Updating product via Icona API:", productId);
      console.log("Raw request body featured field:", req.body.featured);

      // Validate the request body
      const validationResult = createProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Validation failed:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({
          error: "Invalid product data",
          details: validationResult.error.errors,
        });
      }

      const productData = validationResult.data;
      console.log("Validated featured field:", productData.featured);

      // Prepare update data with correct field mapping
      const iconaUpdateData = {
        name: productData.name,
        price: productData.price,
        quantity: productData.quantity,
        images: productData.images,
        userId: productData.userId,
        description: productData.description,
        category: productData.category,
        discountedPrice: productData.discountedPrice,
        startingPrice: productData.startingPrice,
        duration: productData.duration,
        sudden: productData.sudden,
        colors: productData.colors,
        sizes: productData.sizes,
        reserved: productData.reserved,
        listing_type: productData.listingType,
        tokshow: productData.tokshow,
        featured: productData.featured || false,
        shipping_profile: productData.shippingProfile?.trim()
          ? productData.shippingProfile
          : null,
      };

      console.log(
        "Sending to external API - featured field:",
        iconaUpdateData.featured,
      );
      console.log("Sending to external API - sudden:", iconaUpdateData.sudden);
      console.log("Sending to external API - duration:", iconaUpdateData.duration);

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(
        `${ICONA_API_BASE}/products/products/${productId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(iconaUpdateData),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Product update error:", error);
      res.status(500).json({
        error: "Failed to update product",
        message: error.message || "Unknown error occurred",
      });
    }
  });

  // Delete product endpoint (soft delete with PUT)
  app.put("/api/products/:productId/delete", async (req, res) => {
    try {
      const { productId } = req.params;

      console.log("Soft deleting product via Icona API:", productId);

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(
        `${ICONA_API_BASE}/products/products/${productId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ deleted: true }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Product deletion error:", error);
      res.status(500).json({
        error: "Failed to delete product",
        message: error.message || "Unknown error occurred",
      });
    }
  });

  // Bulk edit products endpoint (proxies to Icona API)
  app.put("/api/products/bulkedit", async (req, res) => {
    try {
      const { productIds, updates } = req.body;

      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return res.status(400).json({ error: "productIds array is required" });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({ error: "updates object is required" });
      }

      console.log(`Bulk editing ${productIds.length} products:`, { productIds, updates });

      // Map camelCase to snake_case for Icona API
      const iconaUpdates = {
        ...updates,
        // Map shippingProfile to shipping_profile if present
        ...(updates.shippingProfile && {
          shipping_profile: updates.shippingProfile,
          shippingProfile: undefined
        })
      };

      // Remove undefined fields
      Object.keys(iconaUpdates).forEach(key => {
        if (iconaUpdates[key] === undefined) {
          delete iconaUpdates[key];
        }
      });

      const payload = {
        productIds,
        updates: iconaUpdates
      };

      console.log("Sending to Icona API:", JSON.stringify(payload, null, 2));

      // Include authentication token from session
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.session?.accessToken) {
        headers["Authorization"] = `Bearer ${req.session.accessToken}`;
        console.log("Authorization header added for bulk edit");
      } else {
        console.log("WARNING: No access token found in session for bulk edit");
      }

      const response = await fetch(`${ICONA_API_BASE}/products/products/bulkedit/all`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      console.log(`Icona API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        console.error("Icona API error:", errorData);
        throw new Error(
          errorData.message ||
            `Icona API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Bulk edit successful:", data);
      res.json(data);
    } catch (error: any) {
      console.error("Bulk edit error:", error);
      res.status(500).json({
        error: "Failed to bulk edit products",
        message: error.message || "Unknown error occurred",
      });
    }
  });

}
