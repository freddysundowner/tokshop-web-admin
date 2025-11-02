import type { Express } from "express";
import { ICONA_API_BASE } from "../utils";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import { sendEmail } from "../utils/email";

// Multer configuration for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Admin authorization middleware
function requireAdmin(req: any, res: any, next: any) {
  // Only rely on server-side session data, never trust client headers
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in again.",
    });
  }

  if (!req.session.user.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }

  next();
}

// Super Admin authorization middleware (for CRUD operations)
function requireSuperAdmin(req: any, res: any, next: any) {
  // Only rely on server-side session data, never trust client headers
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in again.",
    });
  }

  if (!req.session.user.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }

  // Check if user has superAdmin role
  if (req.session.user.role !== 'superAdmin') {
    return res.status(403).json({
      success: false,
      error: "Insufficient permissions. Super admin access required for this operation.",
    });
  }

  next();
}

// Demo mode check middleware - prevents CRUD operations in demo mode
async function checkDemoMode(req: any, res: any, next: any) {
  try {
    const accessToken = req.session.accessToken;
    
    if (!accessToken) {
      return next();
    }

    const url = `${ICONA_API_BASE}/admin/app/settings`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return next();
    }

    const data = await response.json();
    const settings = Array.isArray(data) ? data[0] : data;
    
    if (settings?.demoMode === true) {
      return res.status(403).json({
        success: false,
        error: "This operation is disabled in demo mode",
        demoMode: true,
      });
    }

    next();
  } catch (error) {
    console.error('Error checking demo mode:', error);
    next();
  }
}

export function registerAdminRoutes(app: Express) {
  // Check if admin exists (no auth required)
  app.get("/api/admin/exists", async (req, res) => {
    try {
      // Prevent caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Check external API if admin exists
      const url = `${ICONA_API_BASE}/admin/exists`;
      console.log(`Checking if admin exists at external API: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log(`External API returned status ${response.status}`);
        // If endpoint doesn't exist or fails, assume admin doesn't exist
        return res.json({
          success: true,
          exists: false,
        });
      }

      const data = await response.json();
      const adminExists = data.exists === true;
      
      console.log(`✅ External API response: ${JSON.stringify(data)}, adminExists: ${adminExists}`);
      
      return res.json({
        success: true,
        exists: adminExists,
      });
    } catch (error) {
      console.error("Error checking if admin exists:", error);
      // On error, assume admin doesn't exist (safer to show setup)
      return res.json({
        success: true,
        exists: false,
      });
    }
  });

  // Check if setup is needed (no auth required) - kept for backwards compatibility
  app.get("/api/admin/check-setup", async (req, res) => {
    try {
      // Try to get admin list to see if any exist
      const url = `${ICONA_API_BASE}/admin`;
      console.log(`Checking if admins exist: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // If we get a successful response, parse it
      if (response.ok) {
        const data = await response.json();
        const admins = Array.isArray(data) ? data : (data.data || []);
        
        res.json({
          success: true,
          setupNeeded: admins.length === 0,
          adminCount: admins.length,
        });
      } else {
        // If endpoint doesn't exist or fails, assume setup is not needed
        // (conservative approach - show login rather than setup)
        res.json({
          success: true,
          setupNeeded: false,
          adminCount: -1,
        });
      }
    } catch (error: any) {
      console.error("Error checking setup status:", error);
      // On error, assume setup is not needed (show login)
      res.json({
        success: true,
        setupNeeded: false,
        adminCount: -1,
      });
    }
  });

  // Create first admin (no auth required - only for initial setup)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { email, password, username, full_name, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
      }

      // Try different possible endpoints for admin creation
      const possibleEndpoints = [
        `${ICONA_API_BASE}/admin/register`,
        `${ICONA_API_BASE}/admin/signup`,
        `${ICONA_API_BASE}/admin`,
      ];
      
      let response;
      let lastError = null;
      
      for (const url of possibleEndpoints) {
        console.log(`Attempting to create admin at: ${url}`);
        
        try {
          response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
              username: username || "admin",
              full_name: full_name || "Admin",
              firstName: full_name?.split(' ')[0] || "Admin",
              lastName: full_name?.split(' ')[1] || "",
              role: role || "admin",
            }),
          });
          
          if (response.ok) {
            console.log(`✅ Successfully created admin using endpoint: ${url}`);
            break;
          } else {
            const errorText = await response.text();
            console.log(`❌ Endpoint ${url} failed with status ${response.status}: ${errorText.substring(0, 200)}`);
            lastError = { status: response.status, message: errorText };
          }
        } catch (err: any) {
          console.log(`❌ Endpoint ${url} threw error: ${err.message}`);
          lastError = { status: 500, message: err.message };
        }
      }

      if (!response || !response.ok) {
        console.error("All admin creation endpoints failed. Last error:", lastError);
        return res.status(lastError?.status || 500).json({
          success: false,
          error: "Failed to create admin account. The API endpoint may not be available.",
          details: lastError?.message,
        });
      }

      const data = await response.json();
      
      // Store in session
      if (data.accesstoken) {
        req.session.accessToken = data.accesstoken;
        req.session.user = {
          ...data.user,
          admin: true,
        };
      }
      
      res.json({
        success: true,
        user: data.user,
        message: "Admin account created successfully",
      });
    } catch (error: any) {
      console.error("Error creating admin:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create admin",
        details: error.message,
      });
    }
  });

  // Get all users with pagination and search
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.title) queryParams.append("title", req.query.title as string);

      const url = `${ICONA_API_BASE}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      console.log(`Fetching users from: ${url}`);
      console.log(`Using accessToken (first 50 chars): ${accessToken ? accessToken.substring(0, 50) : 'NO TOKEN'}...`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Users API response status: ${response.status}`);
      const contentType = response.headers.get("content-type");
      console.log(`Users API content-type: ${contentType}`);

      // Check if response is JSON
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from users API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Users API returned non-JSON response",
          details: `Status: ${response.status}, Content-Type: ${contentType}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();
      console.log(`Users API data structure:`, Object.keys(data));
      console.log(`Pagination values - totalDoc: ${data.totalDoc}, limits: ${data.limits}, pages (current): ${data.pages}, users count: ${data.users?.length}`);

      if (!response.ok) {
        console.error(`Users API error response:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch users",
          details: data,
        });
      }

      // Calculate total pages: API's "pages" field is current page, not total pages
      const totalPages = Math.ceil(data.totalDoc / data.limits);
      console.log(`Calculated total pages: ${totalPages}, current page: ${data.pages}`);

      // API returns: { users: [...], totalDoc: number, limits: number, pages: currentPage }
      // Transform to include totalPages
      res.json({
        success: true,
        data: {
          users: data.users,
          totalDoc: data.totalDoc,
          limits: data.limits,
          currentPage: data.pages,
          pages: totalPages,
        },
      });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch users",
        details: error.message,
      });
    }
  });

  // Get user addresses
  app.get("/api/admin/users/:userId/addresses", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const response = await fetch(
        `${ICONA_API_BASE}/admin/users/${userId}/addresses`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch user addresses",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching user addresses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user addresses",
        details: error.message,
      });
    }
  });

  // Get user shipping profiles
  app.get("/api/admin/users/:userId/shipping-profiles", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const response = await fetch(
        `${ICONA_API_BASE}/admin/users/${userId}/shipping-profiles`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch user shipping profiles",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching user shipping profiles:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user shipping profiles",
        details: error.message,
      });
    }
  });

  // Get single product by ID (must be before general products route)
  app.get("/api/admin/products/:productId", requireAdmin, async (req, res) => {
    try {
      const { productId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Try fetching with _id query parameter since /products/:id doesn't work
      // Try to populate shipping profile data
      const url = `${ICONA_API_BASE}/products/?_id=${productId}&populate=shipping`;
      console.log(`Fetching product details from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Product details API response status: ${response.status}`);
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from product details API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Product details API returned non-JSON response",
          details: `Status: ${response.status}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`Product details API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch product details",
          details: data,
        });
      }

      // Extract the single product from the products array
      const product = data.products?.[0] || data.data?.products?.[0];
      
      // Log product fields to debug quantity/stock issue
      if (product) {
        console.log(`Product detail fields:`, Object.keys(product));
        console.log(`Product detail quantity/stock values:`, {
          quantity: product.quantity,
          stock: product.stock
        });
      }
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error("Error fetching product details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch product details",
        details: error.message,
      });
    }
  });

  // Get all products (must be after specific product route)
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters following API format: 
      // /products/?page=${page}&limit=${limit}&category=${searchCategory}&title=${searchTitle}&price=${searchPrice}&userid=${id}
      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.category) queryParams.append("category", req.query.category as string);
      if (req.query.title) queryParams.append("title", req.query.title as string);
      if (req.query.price) queryParams.append("price", req.query.price as string);
      if (req.query.userid) queryParams.append("userid", req.query.userid as string);

      const url = `${ICONA_API_BASE}/products/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      console.log(`Fetching products from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Products API response status: ${response.status}`);
      const contentType = response.headers.get("content-type");
      console.log(`Products API content-type: ${contentType}`);

      // Check if response is JSON
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from products API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Products API returned non-JSON response",
          details: `Status: ${response.status}, Content-Type: ${contentType}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();
      console.log(`Products API data structure:`, Object.keys(data));
      
      // Log sample product fields to debug quantity/stock issue
      if (data.products && data.products.length > 0) {
        console.log(`Sample product fields:`, Object.keys(data.products[0]));
        console.log(`Product quantity/stock values:`, {
          quantity: data.products[0].quantity,
          stock: data.products[0].stock
        });
      }

      if (!response.ok) {
        console.error(`Products API error response:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch products",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch products",
        details: error.message,
      });
    }
  });

  // Update product as admin
  app.patch("/api/admin/products/:productId", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const { productId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      console.log(`Admin updating product: ${productId}`);
      console.log(`Update payload:`, req.body);

      const url = `${ICONA_API_BASE}/products/products/${productId}`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      console.log(`Admin product update API response status: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from product update API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Product update API returned non-JSON response",
          details: `Status: ${response.status}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`Product update API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to update product",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update product",
        details: error.message,
      });
    }
  });

  // Get user inventory/products
  app.get("/api/admin/users/:userId/inventory", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const response = await fetch(
        `${ICONA_API_BASE}/admin/users/${userId}/inventory`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch user inventory",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching user inventory:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user inventory",
        details: error.message,
      });
    }
  });

  // Get user orders
  app.get("/api/admin/users/:userId/orders", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const response = await fetch(
        `${ICONA_API_BASE}/admin/users/${userId}/orders`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch user orders",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user orders",
        details: error.message,
      });
    }
  });

  // Get specific user details
  app.get("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/users/${userId}`;
      console.log(`Fetching user details from: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`User details API response status: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      console.log(`User details API content-type: ${contentType}`);
      
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from user details API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "User details API returned non-JSON response",
          details: `Status: ${response.status}, URL: ${url}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch user details",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user details",
        details: error.message,
      });
    }
  });

  // Approve user as seller
  app.patch("/api/admin/users/:userId/approve-seller", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const { userId } = req.params;
      const { email } = req.body;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/users/approveseller/${userId}`;
      console.log(`Approving seller at: ${url}`);
      console.log(`Seller approval payload:`, { email });

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      console.log(`Seller approval API response status: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from seller approval API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Seller approval API returned non-JSON response",
          details: `Status: ${response.status}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`Seller approval API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to approve seller",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error approving seller:", error);
      res.status(500).json({
        success: false,
        error: "Failed to approve seller",
        details: error.message,
      });
    }
  });

  // Update user details
  app.patch("/api/admin/users/:userId", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = req.session.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/users/${userId}`;
      console.log(`Updating user at: ${url}`);
      console.log(`Update payload:`, req.body);

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      console.log(`User update API response status: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from user update API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "User update API returned non-JSON response",
          details: `Status: ${response.status}`,
          response: textResponse.substring(0, 200)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`User update API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to update user",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user",
        details: error.message,
      });
    }
  });

  // Get all transactions
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.userId) queryParams.append("userId", req.query.userId as string);

      const url = `${ICONA_API_BASE}/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log(`Fetching transactions from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Transactions API response status: ${response.status}`);
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error(`Non-JSON response from transactions API: ${textResponse.substring(0, 500)}`);
        return res.status(500).json({
          success: false,
          error: "Transactions API returned non-JSON response",
          details: `Status: ${response.status}`,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`Transactions API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch transactions",
          details: data,
        });
      }

      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transactions",
        details: error.message,
      });
    }
  });

  // Get all shows/rooms with pagination and filters
  app.get("/api/admin/shows", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.title) queryParams.append("title", req.query.title as string);
      if (req.query.type) queryParams.append("type", req.query.type as string);
      queryParams.append("sort", "-1"); // Sort descending

      const url = `${ICONA_API_BASE}/rooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      console.log(`Fetching shows from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch shows",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data.data || data.rooms || [],
        pages: data.pages || 1,
        totalDoc: data.totalDoc || 0,
      });
    } catch (error: any) {
      console.error("Error fetching shows:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch shows",
        details: error.message,
      });
    }
  });

  // Get single show/room with details
  app.get("/api/admin/shows/:showId", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/rooms/${showId}`;
      console.log(`Fetching show details from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch show details",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data.data || data,
      });
    } catch (error: any) {
      console.error("Error fetching show details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch show details",
        details: error.message,
      });
    }
  });

  // Get show auctions (products with saletype=auction)
  app.get("/api/admin/shows/:showId/auctions", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append("roomid", showId);
      queryParams.append("saletype", "auction");
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);

      const url = `${ICONA_API_BASE}/products/?${queryParams.toString()}`;
      console.log(`Fetching show auctions from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch show auctions",
        });
      }

      const data = await response.json();
      
      // Filter out featured auctions on the server side
      const allAuctions = data.data || data.products || [];
      const nonFeaturedAuctions = allAuctions.filter((auction: any) => auction.featured !== true);
      
      res.json({
        success: true,
        data: nonFeaturedAuctions,
        pages: data.pages || 1,
        totalDoc: nonFeaturedAuctions.length,
      });
    } catch (error: any) {
      console.error("Error fetching show auctions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch show auctions",
        details: error.message,
      });
    }
  });

  // Get show giveaways
  app.get("/api/admin/shows/:showId/giveaways", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append("room", showId);
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);

      const url = `${ICONA_API_BASE}/giveaways/?${queryParams.toString()}`;
      console.log(`Fetching show giveaways from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch show giveaways",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data.data || data.giveaways || [],
        pages: data.pages || 1,
        totalDoc: data.totalDoc || 0,
      });
    } catch (error: any) {
      console.error("Error fetching show giveaways:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch show giveaways",
        details: error.message,
      });
    }
  });

  // Get show buy now items
  app.get("/api/admin/shows/:showId/buy-now", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append("roomid", showId);
      queryParams.append("saletype", "buy_now");
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      queryParams.append("featured", "false");

      const url = `${ICONA_API_BASE}/products/?${queryParams.toString()}`;
      console.log(`Fetching show buy now items from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch show buy now items",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data.data || data.products || [],
        pages: data.pages || 1,
        totalDoc: data.totalDoc || 0,
      });
    } catch (error: any) {
      console.error("Error fetching show buy now items:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch show buy now items",
        details: error.message,
      });
    }
  });

  // Get show sold orders
  app.get("/api/admin/shows/:showId/sold", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append("tokshow", showId);
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);

      const url = `${ICONA_API_BASE}/orders?${queryParams.toString()}`;
      console.log(`Fetching show sold orders from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch show sold orders",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data.data || data.orders || [],
        pages: data.pages || 1,
        total: data.total || 0,
      });
    } catch (error: any) {
      console.error("Error fetching show sold orders:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch show sold orders",
        details: error.message,
      });
    }
  });

  // Get demo mode status (lightweight endpoint for permission checking)
  app.get("/api/admin/demo-mode", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/admin/app/settings`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      const settings = Array.isArray(data) ? data[0] : data;
      
      res.json({
        success: true,
        demoMode: settings?.demoMode || false,
      });
    } catch (error: any) {
      console.error("Error fetching demo mode status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch demo mode status",
        demoMode: false, // Default to false on error
      });
    }
  });

  // Get app settings
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/admin/app/settings`;
      console.log(`Fetching app settings from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch app settings",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: Array.isArray(data) ? data[0] : data,
      });
    } catch (error: any) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch app settings",
        details: error.message,
      });
    }
  });

  // Update app settings
  app.post("/api/admin/settings", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/admin/app/settings`;
      console.log(`Updating app settings at: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Settings update error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: "Failed to update app settings",
          details: errorData,
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error updating app settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update app settings",
        details: error.message,
      });
    }
  });

  // Upload app logo
  app.post("/api/admin/upload-logo", requireAdmin, checkDemoMode, upload.single('logo'), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No logo file uploaded",
        });
      }

      const formData = new FormData();
      formData.append('logo', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const url = `${ICONA_API_BASE}/settings/upload-logo`;
      console.log(`Uploading logo to: ${url}`);

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      res.json({
        success: true,
        data: response.data,
        message: "Logo uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload logo",
        details: error.response?.data || error.message,
      });
    }
  });

  // Get admin profile data
  app.get("/api/admin/profile/:userId", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { userId } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/admin/profile/${userId}`;
      console.log(`Fetching admin profile from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch admin profile",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch admin profile",
        details: error.message,
      });
    }
  });

  // Update admin profile
  app.patch("/api/admin/profile", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const userId = req.session.user.id || req.session.user._id;
      const url = `${ICONA_API_BASE}/admin/${userId}`;
      console.log(`Updating admin profile at: ${url}`);
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Profile update error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: "Failed to update profile",
          details: errorData,
        });
      }

      const data = await response.json();
      
      // Update session with new user data
      if (data) {
        req.session.user = { ...req.session.user, ...data };
      }
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        details: error.message,
      });
    }
  });

  // Get application fees with filters
  app.get("/api/admin/application-fees", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add filters if provided
      if (req.query.limit) queryParams.append('limit', req.query.limit as string);
      if (req.query.starting_after) queryParams.append('starting_after', req.query.starting_after as string);
      if (req.query.ending_before) queryParams.append('ending_before', req.query.ending_before as string);
      if (req.query.from) queryParams.append('from', req.query.from as string);
      if (req.query.to) queryParams.append('to', req.query.to as string);
      if (req.query.charge) queryParams.append('charge', req.query.charge as string);
      if (req.query.account) queryParams.append('account', req.query.account as string);

      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/stripe/application/fees${queryString ? `?${queryString}` : ''}`;
      console.log(`Fetching application fees from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch application fees",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: Array.isArray(data) ? data : (data.data || []),
        has_more: data.has_more || false,
      });
    } catch (error: any) {
      console.error("Error fetching application fees:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch application fees",
        details: error.message,
      });
    }
  });

  // Get Stripe transactions/payouts for a specific user
  app.get("/api/admin/stripe-payouts", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Extract filters from query params
      const { status, from, to, destination, limit, starting_after, ending_before } = req.query;

      // Build query params for the external API
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status as string);
      if (from) queryParams.append('from', from as string);
      if (to) queryParams.append('to', to as string);
      if (destination) queryParams.append('destination', destination as string);
      if (limit) queryParams.append('limit', limit as string);
      if (starting_after) queryParams.append('starting_after', starting_after as string);
      if (ending_before) queryParams.append('ending_before', ending_before as string);

      // Call the admin Stripe payouts endpoint to get all payouts
      const stripeUrl = `${ICONA_API_BASE}/stripe/transactions/all/payouts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log(`Fetching all Stripe payouts from: ${stripeUrl}`);
      
      const stripeResponse = await fetch(stripeUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!stripeResponse.ok) {
        console.log(`Stripe API returned ${stripeResponse.status}, returning empty data`);
        return res.json({
          success: true,
          data: [],
          message: "No Stripe data available",
        });
      }

      const stripeData = await stripeResponse.json();
      
      res.json({
        success: true,
        data: stripeData.payouts || stripeData.data || [],
        has_more: stripeData.has_more || false,
      });
    } catch (error: any) {
      console.error("Error fetching Stripe payouts:", error);
      // Return empty data instead of error to avoid breaking the UI
      res.json({
        success: true,
        data: [],
        message: "Unable to fetch Stripe payouts",
      });
    }
  });

  // Get single category by ID
  app.get("/api/admin/categories/:categoryId", requireAdmin, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/category/${categoryId}`;
      console.log(`Fetching category from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch category",
        });
      }

      const data = await response.json();
      console.log('Single category API response structure:', Object.keys(data));
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch category",
        details: error.message,
      });
    }
  });

  // Get categories (list with pagination)
  app.get("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.title) queryParams.append("title", req.query.title as string);

      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/category${queryString ? `?${queryString}` : ''}`;
      console.log(`Fetching categories from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch categories",
        });
      }

      const data = await response.json();
      console.log('Categories API response structure:', Object.keys(data));
      console.log('Categories API response data type:', Array.isArray(data) ? 'Array' : typeof data);
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch categories",
        details: error.message,
      });
    }
  });

  // Add single category with image
  app.post("/api/admin/categories", requireAdmin, checkDemoMode, upload.array('images', 5), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { name } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Category name is required",
        });
      }

      // Create form data for the API request
      const formData = new FormData();
      formData.append('name', name);
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('images', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
          });
        });
      }

      const url = `${ICONA_API_BASE}/category`;
      
      console.log(`Adding category to: ${url}`);
      
      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error adding category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add category",
        details: error.message,
      });
    }
  });

  // Update category with image
  app.put("/api/admin/categories/:id", requireAdmin, checkDemoMode, upload.array('images', 5), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { name } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Category name is required",
        });
      }

      // Create form data for the API request
      const formData = new FormData();
      formData.append('name', name);
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('images', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
          });
        });
      }

      const url = `${ICONA_API_BASE}/category/${id}`;
      
      console.log(`Updating category at: ${url}`);
      
      const response = await axios.put(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error updating category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update category",
        details: error.message,
      });
    }
  });

  // Bulk import categories
  app.post("/api/admin/categories/bulk", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { names } = req.body;
      
      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Names array is required",
        });
      }

      // Convert array of strings to array of objects with name property
      const formattedNames = names.map(name => ({ name }));

      const url = `${ICONA_API_BASE}/category/bulk/add`;
      console.log(`Bulk importing categories to: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedNames),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to bulk import categories",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error bulk importing categories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk import categories",
        details: error.message,
      });
    }
  });

  // Add single subcategory with image
  app.post("/api/admin/subcategories", requireAdmin, checkDemoMode, upload.array('images', 5), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { name, category } = req.body;
      const files = req.files as Express.Multer.File[];

      console.log('Add subcategory - Request body:', req.body);
      console.log('Add subcategory - Files:', files?.length || 0);

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Subcategory name is required",
        });
      }

      if (!category) {
        console.error('Category field missing! Body keys:', Object.keys(req.body));
        return res.status(400).json({
          success: false,
          error: "Category ID is required",
        });
      }

      // Create form data for the API request
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('type', 'child');
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('images', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
          });
        });
      }

      const url = `${ICONA_API_BASE}/category`;
      
      console.log(`Adding subcategory to: ${url}`);
      
      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error adding subcategory:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add subcategory",
        details: error.message,
      });
    }
  });

  // Update subcategory with image
  app.put("/api/admin/subcategories/:id", requireAdmin, checkDemoMode, upload.array('images', 5), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { name, category } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Subcategory name is required",
        });
      }

      // Create form data for the API request
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', 'child');
      if (category) {
        formData.append('category', category);
      }
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('images', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
          });
        });
      }

      const url = `${ICONA_API_BASE}/category/${id}`;
      
      console.log(`Updating subcategory at: ${url}`);
      
      const response = await axios.put(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error updating subcategory:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update subcategory",
        details: error.message,
      });
    }
  });

  // Bulk import subcategories
  app.post("/api/admin/categories/:categoryId/subcategories/bulk", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { categoryId } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { names } = req.body;
      
      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Names array is required",
        });
      }

      // Convert array of strings to array of objects with name and type properties
      const formattedNames = names.map(name => ({ name, type: 'child' }));

      const url = `${ICONA_API_BASE}/category/subcategory/bulk/${categoryId}`;
      console.log(`Bulk importing subcategories to: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedNames),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to bulk import subcategories",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error bulk importing subcategories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk import subcategories",
        details: error.message,
      });
    }
  });

  // Convert category type (child to parent or parent to child)
  app.put("/api/admin/categories/:id/convert", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      const { targetType, parentId } = req.body;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!targetType || !['parent', 'child'].includes(targetType)) {
        return res.status(400).json({
          success: false,
          error: "Valid target type (parent or child) is required",
        });
      }

      if (targetType === 'child' && !parentId) {
        return res.status(400).json({
          success: false,
          error: "Parent category ID is required when converting to child",
        });
      }

      const formData = new FormData();
      
      // Get the current category data first
      const getCategoryUrl = `${ICONA_API_BASE}/category/${id}`;
      const getCategoryResponse = await fetch(getCategoryUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!getCategoryResponse.ok) {
        throw new Error("Failed to fetch category details");
      }

      const categoryData = await getCategoryResponse.json();
      const currentCategory = categoryData.data || categoryData;

      // Prepare the update based on target type
      formData.append('name', currentCategory.name);
      
      if (targetType === 'child') {
        // Converting to child: add parent reference and set type to child
        formData.append('category', parentId);
        formData.append('type', 'child');
      } else {
        // Converting to parent: remove parent reference and set type to parent
        formData.append('type', 'parent');
        // Don't include category field to remove parent reference
      }

      const url = `${ICONA_API_BASE}/category/${id}`;
      console.log(`Converting category type at: ${url} to ${targetType}`);
      
      const response = await axios.put(url, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = response.data;
      
      res.json({
        success: true,
        data: data,
        message: `Category converted to ${targetType} successfully`,
      });
    } catch (error: any) {
      console.error("Error converting category type:", error);
      res.status(500).json({
        success: false,
        error: "Failed to convert category type",
        details: error.message,
      });
    }
  });

  // Delete subcategory
  app.delete("/api/admin/subcategories/:id", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/category/${id}`;
      console.log(`Deleting subcategory from: ${url}`);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to delete subcategory",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete subcategory",
        details: error.message,
      });
    }
  });

  // Delete category
  app.delete("/api/admin/categories/:id", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/category/${id}`;
      console.log(`Deleting category from: ${url}`);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to delete category",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete category",
        details: error.message,
      });
    }
  });

  // Get all disputes with pagination
  app.get("/api/admin/disputes", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.status) queryParams.append("status", req.query.status as string);

      const url = `${ICONA_API_BASE}/orders/all/disputes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      console.log(`Fetching disputes from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to fetch disputes",
        });
      }

      const data = await response.json();
      console.log('Disputes list API response sample:', JSON.stringify(data[0], null, 2));
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch disputes",
        details: error.message,
      });
    }
  });

  // Get single dispute by ID
  app.get("/api/admin/disputes/:disputeId", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { disputeId } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/orders/dispute/${disputeId}`;
      console.log(`Fetching dispute from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log('Dispute detail response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Dispute detail API error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to fetch dispute",
        });
      }

      const data = await response.json();
      console.log('Dispute detail API response:', JSON.stringify(data, null, 2));
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dispute",
        details: error.message,
      });
    }
  });

  // Resolve a dispute
  app.post("/api/admin/disputes/:disputeId/resolve", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { disputeId } = req.params;
      const { favored, final_comments } = req.body;
      
      console.log(`[Resolve Dispute] Received request for dispute ID: ${disputeId}`);
      console.log(`[Resolve Dispute] Favored user: ${favored}, Comments: ${final_comments}`);
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!favored) {
        return res.status(400).json({
          success: false,
          error: "Favored user ID is required",
        });
      }

      const url = `${ICONA_API_BASE}/orders/close/dispute/${disputeId}`;
      console.log(`[Resolve Dispute] Calling ICONA API: ${url}`);
      console.log(`[Resolve Dispute] Payload:`, { favored, final_comments });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          favored,
          final_comments: final_comments || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to resolve dispute",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({
        success: false,
        error: "Failed to resolve dispute",
        details: error.message,
      });
    }
  });

  // Get all reported cases
  app.get("/api/admin/reported-cases", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      queryParams.append("populate", "reported reported_by");

      const url = `${ICONA_API_BASE}/users/reports/cases${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log(`Fetching reported cases from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Reported cases API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Reported cases API error:`, errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to fetch reported cases",
        });
      }

      const data = await response.json();
      console.log('Reported cases API response:', JSON.stringify(data, null, 2));
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching reported cases:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch reported cases",
        details: error.message,
      });
    }
  });

  // Block/Unblock a user
  app.patch("/api/admin/users/:userId/block", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { userId } = req.params;
      const { blocked } = req.body;
      
      console.log(`[Block User] Request to ${blocked ? 'block' : 'unblock'} user: ${userId}`);
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (typeof blocked !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: "Blocked status is required and must be a boolean",
        });
      }

      const url = `${ICONA_API_BASE}/users/${userId}`;
      console.log(`[Block User] Calling ICONA API: ${url}`);
      console.log(`[Block User] Payload:`, { system_blocked: blocked });
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ system_blocked: blocked }),
      });

      console.log(`[Block User] API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Block User] API error:`, errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to ${blocked ? 'block' : 'unblock'} user`,
        });
      }

      const data = await response.json();
      console.log('[Block User] Success:', data);
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error(`Error blocking/unblocking user:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to update user block status",
        details: error.message,
      });
    }
  });

  // Refund order or transaction
  app.put("/api/admin/refund/:id", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { id } = req.params;
      const { type } = req.body;
      
      console.log(`[Refund] Request to refund ${type}: ${id}`);
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!type || (type !== 'order' && type !== 'transaction')) {
        return res.status(400).json({
          success: false,
          error: "Type is required and must be 'order' or 'transaction'",
        });
      }

      const url = `${ICONA_API_BASE}/orders/refund/order/transaction/${id}`;
      console.log(`[Refund] Calling ICONA API: ${url} with type: ${type}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      console.log(`[Refund] API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Refund] API error:`, errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to process refund",
        });
      }

      const data = await response.json();
      console.log('[Refund] Success:', data);
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error(`Error processing refund:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to process refund",
        details: error.message,
      });
    }
  });

  // Get refunds list
  app.get("/api/admin/refunds", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const queryParams = new URLSearchParams();
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.page) queryParams.append("page", req.query.page as string);

      const url = `${ICONA_API_BASE}/stripe/refunds/list/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log(`Fetching refunds from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Refunds API error:`, errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Failed to fetch refunds",
        });
      }

      const data = await response.json();
      console.log('[Refunds] API Response Structure:', JSON.stringify(data, null, 2));
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching refunds:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch refunds",
        details: error.message,
      });
    }
  });

  // Send email to users
  app.post("/api/admin/send-email", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { recipientType, recipientEmail, subject, message, isHtmlMode } = req.body;

      // Validate required fields
      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          error: "Subject and message are required",
        });
      }

      if (recipientType === "individual" && !recipientEmail) {
        return res.status(400).json({
          success: false,
          error: "Recipient email is required for individual emails",
        });
      }

      // Fetch email settings
      const settingsUrl = `${ICONA_API_BASE}/admin/app/settings`;
      const settingsResponse = await fetch(settingsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!settingsResponse.ok) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch email settings",
        });
      }

      const settingsData = await settingsResponse.json();
      const settings = Array.isArray(settingsData) ? settingsData[0] : settingsData;

      // Validate email configuration
      if (!settings?.email_from_address) {
        return res.status(400).json({
          success: false,
          error: "From email address is not configured. Please configure email settings first.",
        });
      }

      // Provider-specific validation
      const provider = settings.email_service_provider?.toLowerCase();
      const validProviders = ['sendgrid', 'mailgun', 'resend', 'smtp'];

      if (!provider || !validProviders.includes(provider)) {
        return res.status(400).json({
          success: false,
          error: `Email provider is not configured or invalid. Please select one of: ${validProviders.join(', ')}`,
        });
      }
      
      if (provider === 'mailgun') {
        if (!settings.email_api_key || settings.email_api_key.trim() === '') {
          return res.status(400).json({
            success: false,
            error: "Mailgun API key is not configured",
          });
        }
        if (!settings.email_mailgun_domain || settings.email_mailgun_domain.trim() === '') {
          return res.status(400).json({
            success: false,
            error: "Mailgun domain is not configured",
          });
        }
      } else if (provider === 'smtp') {
        const missingFields = [];
        if (!settings.email_smtp_host || settings.email_smtp_host.trim() === '') missingFields.push('host');
        if (!settings.email_smtp_port || settings.email_smtp_port.trim() === '') missingFields.push('port');
        if (!settings.email_smtp_user || settings.email_smtp_user.trim() === '') missingFields.push('username');
        if (!settings.email_smtp_pass || settings.email_smtp_pass.trim() === '') missingFields.push('password');
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            error: `SMTP configuration is incomplete. Missing or empty: ${missingFields.join(', ')}`,
          });
        }
      } else if (provider === 'sendgrid' || provider === 'resend') {
        if (!settings.email_api_key || settings.email_api_key.trim() === '') {
          return res.status(400).json({
            success: false,
            error: `${provider === 'sendgrid' ? 'SendGrid' : 'Resend'} API key is not configured`,
          });
        }
      }

      // Get recipients
      let recipients: any[] = [];
      
      if (recipientType === "all") {
        // Fetch all users
        const usersUrl = `${ICONA_API_BASE}/users?limit=10000`;
        const usersResponse = await fetch(usersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!usersResponse.ok) {
          return res.status(500).json({
            success: false,
            error: "Failed to fetch users",
          });
        }

        const usersData = await usersResponse.json();
        recipients = usersData.users || [];
      } else {
        // Individual email - fetch user data to get name fields
        const usersUrl = `${ICONA_API_BASE}/users?limit=10000`;
        const usersResponse = await fetch(usersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const allUsers = usersData.users || [];
          // Find the specific user by email
          const targetUser = allUsers.find((u: any) => u.email === recipientEmail);
          recipients = targetUser ? [targetUser] : [{ email: recipientEmail }];
        } else {
          // Fallback if we can't fetch users
          recipients = [{ email: recipientEmail }];
        }
      }

      // Send emails
      const emailPromises = recipients.map(async (user) => {
        // Log user structure to debug name fields
        console.log('User object for name replacement:', JSON.stringify(user, null, 2));
        
        // Try to get the user's name from various possible field names
        let userName = "there"; // default fallback
        
        // Check various field name combinations
        if (user.firstName && user.lastName) {
          userName = `${user.firstName} ${user.lastName}`;
        } else if (user.first_name && user.last_name) {
          userName = `${user.first_name} ${user.last_name}`;
        } else if (user.firstName) {
          userName = user.firstName;
        } else if (user.first_name) {
          userName = user.first_name;
        } else if (user.name) {
          userName = user.name;
        } else if (user.fullName) {
          userName = user.fullName;
        } else if (user.username) {
          userName = user.username;
        }
        
        console.log('Resolved user name:', userName);
        
        // Personalize message with user's name
        const personalizedMessage = message.replace(/{name}/g, userName);

        // Generate HTML based on mode
        let htmlMessage: string;
        if (isHtmlMode) {
          // HTML mode: use the personalized message as-is (user provides full HTML)
          htmlMessage = personalizedMessage;
        } else {
          // Normal mode: wrap the message in a simple template
          htmlMessage = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .message { white-space: pre-wrap; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="message">${personalizedMessage}</div>
                </div>
              </body>
            </html>
          `;
        }

        try {
          await sendEmail(settings, {
            to: user.email,
            subject,
            html: htmlMessage,
            text: personalizedMessage,
          });
          return { success: true, email: user.email };
        } catch (error: any) {
          console.error(`Failed to send email to ${user.email}:`, error.message);
          return { success: false, email: user.email, error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `Email sent successfully to ${successCount} recipient(s)${failureCount > 0 ? `. ${failureCount} failed.` : ''}`,
        details: {
          total: recipients.length,
          successful: successCount,
          failed: failureCount,
          failures: results.filter(r => !r.success),
        },
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send email",
        details: error.message,
      });
    }
  });

  // Send app update notification to all users
  app.post("/api/admin/send-update-notification", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { androidLink, iosLink, androidVersion, iosVersion, recipientType, recipientEmail } = req.body;

      // Validate recipient selection
      if (recipientType === "individual" && !recipientEmail) {
        return res.status(400).json({
          success: false,
          error: "Recipient email is required for individual notifications",
        });
      }

      // Fetch email settings
      const settingsUrl = `${ICONA_API_BASE}/admin/app/settings`;
      const settingsResponse = await fetch(settingsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!settingsResponse.ok) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch email settings",
        });
      }

      const settingsData = await settingsResponse.json();
      const settings = Array.isArray(settingsData) ? settingsData[0] : settingsData;

      // Validate email configuration
      if (!settings?.email_from_address) {
        return res.status(400).json({
          success: false,
          error: "From email address is not configured. Please configure email settings first.",
        });
      }

      // Get recipients based on type
      let recipients: any[] = [];
      
      if (recipientType === "all") {
        // Fetch all users
        const usersUrl = `${ICONA_API_BASE}/users?limit=10000`;
        const usersResponse = await fetch(usersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!usersResponse.ok) {
          return res.status(500).json({
            success: false,
            error: "Failed to fetch users",
          });
        }

        const usersData = await usersResponse.json();
        recipients = usersData.users || [];
      } else {
        // Individual notification - fetch user data to get name fields
        const usersUrl = `${ICONA_API_BASE}/users?limit=10000`;
        const usersResponse = await fetch(usersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const allUsers = usersData.users || [];
          // Find the specific user by email
          const targetUser = allUsers.find((u: any) => u.email === recipientEmail);
          recipients = targetUser ? [targetUser] : [{ email: recipientEmail }];
        } else {
          // Fallback if we can't fetch users
          recipients = [{ email: recipientEmail }];
        }
      }

      const appName = settings.app_name || "Our App";

      // Send emails in batches to avoid rate limiting
      // Note: New Mailgun accounts have probation limits (100 emails/hour)
      // Formula: BATCH_DELAY = (BATCH_SIZE / max_emails_per_hour) * 3600000
      // Example: (10 / 90) * 3600000 = 400000ms = 6.67 minutes between batches
      const BATCH_SIZE = 10; // Send 10 emails per batch
      const BATCH_DELAY = 400000; // 400 seconds (6.67 minutes) = ~90 emails/hour
      
      const results: any[] = [];
      
      // Helper function to delay execution
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Process recipients in batches
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);
        console.log(`Sending email batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);
        
        const batchPromises = batch.map(async (user: any) => {
          // Get user's name
          let userName = "there";
          if (user.firstName && user.lastName) {
            userName = `${user.firstName} ${user.lastName}`;
          } else if (user.first_name && user.last_name) {
            userName = `${user.first_name} ${user.last_name}`;
          } else if (user.firstName) {
            userName = user.firstName;
          } else if (user.first_name) {
            userName = user.first_name;
          } else if (user.name) {
            userName = user.name;
          } else if (user.fullName) {
            userName = user.fullName;
          } else if (user.username) {
            userName = user.username;
          }

          // Create professional HTML email
          const htmlMessage = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                  }
                  .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  }
                  .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #ffffff;
                    padding: 40px 20px;
                    text-align: center;
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                  }
                  .header p {
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.9;
                  }
                  .content {
                    padding: 40px 30px;
                  }
                  .greeting {
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #333;
                  }
                  .message {
                    font-size: 16px;
                    line-height: 1.8;
                    color: #555;
                    margin-bottom: 30px;
                  }
                  .version-info {
                    background-color: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 4px;
                  }
                  .version-info h3 {
                    margin: 0 0 15px 0;
                    color: #333;
                    font-size: 18px;
                  }
                  .version-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                  }
                  .version-item:last-child {
                    border-bottom: none;
                  }
                  .version-label {
                    font-weight: 600;
                    color: #555;
                  }
                  .version-number {
                    color: #667eea;
                    font-weight: 600;
                  }
                  .buttons {
                    margin: 30px 0;
                  }
                  .button {
                    display: inline-block;
                    padding: 14px 32px;
                    margin: 8px 8px 8px 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 15px;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                    transition: transform 0.2s;
                  }
                  .button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                  }
                  .whatsapp-button {
                    display: inline-block;
                    padding: 16px 40px;
                    margin: 15px 0;
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 17px;
                    box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
                    transition: all 0.3s;
                    text-align: center;
                    width: 100%;
                    box-sizing: border-box;
                  }
                  .whatsapp-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5);
                    background: linear-gradient(135deg, #128C7E 0%, #25D366 100%);
                  }
                  .footer {
                    background-color: #f8f9fa;
                    padding: 30px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                  }
                  .footer p {
                    margin: 5px 0;
                  }
                  .features-banner {
                    background-color: #f5f7fa;
                    border-radius: 8px;
                    padding: 30px 20px;
                    margin: 30px 0;
                  }
                  .features-banner h3 {
                    text-align: center;
                    color: #333;
                    margin: 0 0 25px 0;
                    font-size: 22px;
                  }
                  .features-grid {
                    width: 100%;
                  }
                  .feature-row {
                    width: 100%;
                    margin-bottom: 10px;
                  }
                  .feature-item {
                    display: inline-block;
                    width: 48%;
                    background: #ffffff;
                    padding: 15px 10px;
                    border-radius: 6px;
                    text-align: center;
                    border: 1px solid #e0e0e0;
                    margin: 0 1% 10px 0;
                    vertical-align: top;
                    box-sizing: border-box;
                  }
                  .feature-icon {
                    font-size: 28px;
                    display: block;
                    margin-bottom: 8px;
                  }
                  .feature-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                  }
                  @media only screen and (max-width: 600px) {
                    .container {
                      margin: 0;
                      border-radius: 0;
                    }
                    .content {
                      padding: 30px 20px;
                    }
                    .button {
                      display: block;
                      margin: 10px 0;
                    }
                    .whatsapp-button {
                      display: block;
                      margin: 15px 0;
                      padding: 14px 30px;
                      font-size: 16px;
                    }
                    .feature-item {
                      width: 100% !important;
                      display: block !important;
                      margin: 0 0 10px 0 !important;
                    }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 New Update Available!</h1>
                    <p>We've made ${appName} even better</p>
                  </div>
                  
                  <div class="content">
                    <div class="greeting">
                      Hi ${userName}! 👋
                    </div>
                    
                    <div class="message">
                      <p>We're excited to announce that a new version of <strong>${appName}</strong> is now available!</p>
                      <p>This update includes bug fixes, performance improvements, and exciting new features to enhance your experience.</p>
                    </div>

                    <div class="version-info">
                      <h3>📱 Latest Versions</h3>
                      ${androidVersion ? `
                      <div class="version-item">
                        <span class="version-label">Android</span>
                        <span class="version-number">v${androidVersion}</span>
                      </div>
                      ` : ''}
                      ${iosVersion ? `
                      <div class="version-item">
                        <span class="version-label">iOS</span>
                        <span class="version-number">v${iosVersion}</span>
                      </div>
                      ` : ''}
                    </div>

                    <div class="buttons">
                      ${androidVersion && androidLink ? `
                        <a href="${androidLink}" class="button">
                          📲 Update on Android
                        </a>
                      ` : ''}
                      ${iosVersion && iosLink ? `
                        <a href="${iosLink}" class="button">
                          🍎 Update on iOS
                        </a>
                      ` : ''}
                      <a href="https://admin.iconaapp.com/" class="button">
                        🏪 Seller Hub Portal
                      </a>
                      <a href="https://admin.iconaapp.com/admin/login" class="button">
                        🔐 Admin Portal
                      </a>
                    </div>

                    <a href="https://wa.me/254791334234" class="whatsapp-button">
                      💬 Contact Us on WhatsApp
                    </a>

                    <div class="features-banner">
                      <h3>✨ What's Inside ${appName}</h3>
                      <div class="features-grid">
                        <div class="feature-item">
                          <div class="feature-icon">🔴</div>
                          <p class="feature-title">Live Streaming & Auctions</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">🎁</div>
                          <p class="feature-title">Giveaway System</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">💬</div>
                          <p class="feature-title">Live Chat & Messaging</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">💰</div>
                          <p class="feature-title">Tipping & Commission</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">📦</div>
                          <p class="feature-title">USPS Shipping</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">🌍</div>
                          <p class="feature-title">Multi-Language</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">🎨</div>
                          <p class="feature-title">Dark & Light Theme</p>
                        </div>
                        <div class="feature-item">
                          <div class="feature-icon">⚡</div>
                          <p class="feature-title">Order Management</p>
                        </div>
                      </div>
                    </div>

                    <a href="https://wa.me/254791334234" class="whatsapp-button">
                      💬 Need Help? Chat with Us on WhatsApp
                    </a>

                    <div class="message">
                      <p>Update now to enjoy the latest features and improvements!</p>
                      <p style="margin-top: 20px;">Thank you for using ${appName}! ❤️</p>
                    </div>
                  </div>

                  <div class="footer">
                    <p><strong>${appName}</strong></p>
                    <p>This is an automated update notification</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          const textMessage = `
Hi ${userName}!

A new version of ${appName} is now available!

Latest Versions:
${androidVersion ? `- Android: v${androidVersion}` : ''}
${iosVersion ? `- iOS: v${iosVersion}` : ''}

Update Links:
${androidVersion && androidLink ? `Android: ${androidLink}` : ''}
${iosVersion && iosLink ? `iOS: ${iosLink}` : ''}

Quick Access:
- Seller Hub Portal: https://admin.iconaapp.com/
- Admin Portal: https://admin.iconaapp.com/admin/login

💬 Contact Us on WhatsApp: https://wa.me/254791334234

✨ What's Inside ${appName}:
• Live Streaming & Auctions - Engage customers with live sales
• Giveaway System - Run exciting contests and promotions
• Live Chat & Messaging - Connect directly with buyers
• Tipping & Commission - Multiple revenue streams
• USPS Shipping - Integrated shipping solutions
• Multi-Language - Reach global audiences
• Dark & Light Theme - Comfortable viewing experience
• Order Management - Complete fulfillment system

💬 Need Help? Chat with Us on WhatsApp: https://wa.me/254791334234

Update now to enjoy the latest features and improvements!

Thank you for using ${appName}!
          `.trim();

          try {
            await sendEmail(settings, {
              to: user.email,
              subject: `🎉 ${appName} Update Available - New Features & Improvements`,
              html: htmlMessage,
              text: textMessage,
            });
            console.log(`✓ Email sent to ${user.email}`);
            return { success: true, email: user.email };
          } catch (error: any) {
            console.error(`✗ Failed to send email to ${user.email}:`, error.message);
            return { success: false, email: user.email, error: error.message };
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < recipients.length) {
          console.log(`Waiting ${BATCH_DELAY / 1000} seconds before next batch...`);
          await delay(BATCH_DELAY);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`Email batch sending complete: ${successCount} successful, ${failureCount} failed`);

      res.json({
        success: true,
        message: `Update notification sent successfully to ${successCount} user(s)${failureCount > 0 ? `. ${failureCount} failed.` : ''}`,
        details: {
          total: recipients.length,
          successful: successCount,
          failed: failureCount,
          failures: results.filter(r => !r.success),
        },
      });
    } catch (error: any) {
      console.error("Error sending update notification:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send update notification",
        details: error.message,
      });
    }
  });

  app.get("/api/theme-colors", async (req, res) => {
    try {
      const url = `${ICONA_API_BASE}/admin/app/settings`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch theme colors",
        });
      }

      const settingsData = await response.json();
      const settings = Array.isArray(settingsData) ? settingsData[0] : settingsData;

      res.json({
        success: true,
        data: {
          primary_color: settings.primary_color || 'FFFACC15',
          secondary_color: settings.secondary_color || 'FF0D9488',
          app_logo: settings.app_logo || '',
        },
      });
    } catch (error: any) {
      console.error("Error fetching theme colors:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch theme colors",
        details: error.message,
      });
    }
  });

  // Get translations from settings
  app.get("/api/admin/translations", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/settings/translations`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch translations",
        });
      }

      const data = await response.json();
      
      console.log('[Translations GET] API response keys:', Object.keys(data));
      console.log('[Translations GET] default_language value:', data.default_language);
      console.log('[Translations GET] defaultLanguage value:', data.defaultLanguage);
      
      // API returns { success: true, version: 1, default_language: "en", translations: { en: {...}, es: {...} } }
      res.json({
        success: true,
        data: {
          version: data.version,
          default_language: data.default_language || data.defaultLanguage,
          translations: data.translations || {},
        },
      });
    } catch (error: any) {
      console.error("Error fetching translations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch translations",
        details: error.message,
      });
    }
  });

  // Save translations
  app.post("/api/admin/translations", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const { translations, default_language } = req.body;

      if (!translations || typeof translations !== 'object') {
        return res.status(400).json({
          success: false,
          error: "Translations data is required",
        });
      }

      const url = `${ICONA_API_BASE}/settings/translations`;
      
      // Build payload - send translations and optionally default_language
      const payload: any = { ...translations };
      
      // If default_language is provided, include it in the payload
      if (default_language) {
        // Check the API structure - it might expect { default_language, ...translations } or just translations with default_language as a sibling
        // For now, send both as root-level properties
        const fullPayload: any = {};
        if (default_language) {
          fullPayload.default_language = default_language;
        }
        // Add all translation languages
        Object.keys(translations).forEach(lang => {
          fullPayload[lang] = translations[lang];
        });
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fullPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return res.status(response.status).json({
            success: false,
            error: errorData.error || errorData.message || "Failed to save translations",
          });
        }

        const data = await response.json();

        return res.json({
          success: true,
          message: "Translations updated successfully",
          data: data.translations || {},
        });
      }
      
      // Send translations directly as the root object (API expects the whole translations map)
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translations),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.error || errorData.message || "Failed to save translations",
        });
      }

      const data = await response.json();

      res.json({
        success: true,
        message: "Translations updated successfully",
        data: data.translations || {},
      });
    } catch (error: any) {
      console.error("Error saving translations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save translations",
        details: error.message,
      });
    }
  });

  // Download translations as XML
  app.get("/api/admin/translations/download", requireAdmin, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const url = `${ICONA_API_BASE}/settings/translations`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch translations",
        });
      }

      const data = await response.json();
      const translations = data.translations || {};
      const version = data.version;
      const defaultLanguage = data.default_language;
      
      // Convert translations to XML format with version and default_language attributes
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<translations';
      if (version !== undefined) xml += ` version="${version}"`;
      if (defaultLanguage) xml += ` default_language="${defaultLanguage}"`;
      xml += '>\n';
      
      for (const [languageCode, strings] of Object.entries(translations)) {
        xml += `  <language code="${languageCode}">\n`;
        
        if (typeof strings === 'object' && strings !== null) {
          for (const [key, value] of Object.entries(strings)) {
            const escapedValue = String(value || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
            xml += `    <string name="${key}">${escapedValue}</string>\n`;
          }
        }
        
        xml += `  </language>\n`;
      }
      
      xml += '</translations>';
      
      // Send XML file as download
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="translations.xml"');
      res.send(xml);
    } catch (error: any) {
      console.error("Error downloading translations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download translations",
        details: error.message,
      });
    }
  });

  // Upload translations from XML
  app.post("/api/admin/translations/upload", requireAdmin, checkDemoMode, upload.single('file'), async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // Parse XML
      const xmlContent = req.file.buffer.toString('utf-8');
      const translations: Record<string, Record<string, string>> = {};
      
      // Simple XML parsing (extract language blocks and strings)
      const languageRegex = /<language code="([^"]+)">([\s\S]*?)<\/language>/g;
      let languageMatch;
      
      while ((languageMatch = languageRegex.exec(xmlContent)) !== null) {
        const languageCode = languageMatch[1];
        const languageContent = languageMatch[2];
        
        translations[languageCode] = {};
        
        const stringRegex = /<string name="([^"]+)">([^<]*)<\/string>/g;
        let stringMatch;
        
        while ((stringMatch = stringRegex.exec(languageContent)) !== null) {
          const key = stringMatch[1];
          const value = stringMatch[2]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          
          translations[languageCode][key] = value;
        }
      }

      if (Object.keys(translations).length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid XML format or no translations found",
        });
      }

      // Save translations to backend
      const url = `${ICONA_API_BASE}/settings/translations`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translations),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.error || errorData.message || "Failed to save translations",
        });
      }

      const data = await response.json();

      res.json({
        success: true,
        message: `Translations uploaded successfully. ${Object.keys(translations).length} language(s) imported.`,
        data: data.translations || {},
      });
    } catch (error: any) {
      console.error("Error uploading translations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload translations",
        details: error.message,
      });
    }
  });

  // Change admin password
  app.post("/api/admin/change-password", requireAdmin, checkDemoMode, async (req, res) => {
    try {
      const accessToken = req.session.accessToken;
      const { currentPassword, newPassword } = req.body;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "New password must be at least 6 characters long",
        });
      }

      const userId = req.session.user.id || req.session.user._id;
      const url = `${ICONA_API_BASE}/admin/${userId}`;
      console.log(`Changing admin password at: ${url}`);
      
      // Log what we're sending
      console.log(`Password change payload:`, { password: '[REDACTED]' });
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Password change error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || errorData.error || "Failed to change password",
        });
      }

      const data = await response.json();
      
      res.json({
        success: true,
        message: "Password changed successfully",
        data: data,
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change password",
        details: error.message,
      });
    }
  });
}
