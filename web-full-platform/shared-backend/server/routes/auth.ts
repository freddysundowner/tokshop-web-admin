import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";
import { verifyFirebaseToken } from "../firebase-admin";
import {
  signupSchema,
  loginSchema,
  socialAuthSchema,
  socialAuthCompleteSchema,
  iconaAuthResponseSchema,
  IconaAuthResponse,
  IconaApiErrorResponse,
} from "../../shared/schema";

// Resilient fetch helper that handles non-JSON responses gracefully
async function resilientFetch(url: string, options: any) {
  console.log(
    `[Resilient Fetch] Requesting: ${options.method || "GET"} ${url}`,
  );

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");

    console.log(
      `[Resilient Fetch] Response: ${response.status} ${response.statusText}`,
    );
    console.log(`[Resilient Fetch] Content-Type: ${contentType}`);

    let responseData;
    if (contentType && contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch (jsonError) {
        console.error(
          "[Resilient Fetch] Failed to parse JSON response:",
          jsonError,
        );
        const textData = await response.text();
        console.error(
          "[Resilient Fetch] Raw response:",
          textData.slice(0, 200),
        );
        throw new Error(`API returned invalid JSON: ${textData.slice(0, 200)}`);
      }
    } else {
      const textData = await response.text();
      console.error(
        `[Resilient Fetch] Non-JSON response received:`,
        textData.slice(0, 200),
      );
      throw new Error(
        `API returned non-JSON response (${contentType}): ${textData.slice(0, 100)}`,
      );
    }

    return { response, data: responseData };
  } catch (error) {
    console.error("[Resilient Fetch] Network/Parse error:", error);
    throw error;
  }
}

export function registerAuthRoutes(app: Express) {
  // Authentication signup proxy
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("Proxying signup request to Icona API");
      console.log("Signup payload received:", {
        ...req.body,
        password: "[REDACTED]",
      });

      // Validate request body using schema
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { email, country, firstName, lastName, userName, phone, password } = validationResult.data;

      const { response, data: responseData } = await resilientFetch(
        `${ICONA_API_BASE}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            country,
            firstName,
            lastName,
            userName,
            phone,
            password,
          }),
        },
      );

      if (!response.ok) {
        const errorData = responseData as IconaApiErrorResponse;
        console.error("Icona API signup error:", errorData);

        // Return the actual API message instead of friendly messages
        return res.status(response.status).json({
          success: false,
          message: errorData.message, // Use the actual API message
          error: errorData.message || "Account creation failed. Please try again.", // Fallback for compatibility
          details: errorData,
        });
      }

      // Validate the successful response
      const parseResult = iconaAuthResponseSchema.safeParse(responseData);
      if (!parseResult.success) {
        console.error("Invalid signup response structure:", parseResult.error);
        return res.status(500).json({
          success: false,
          error: "Invalid response from authentication service",
        });
      }

      const data = parseResult.data;
      console.log("Signup successful");

      // Store session data and return access token for header-based persistence
      req.session.user = data.data;
      req.session.accessToken = data.accessToken;

      res.json({
        success: true,
        data: data.data,
        accessToken: data.accessToken, // Return token for localStorage storage
        message: data.message,
      });
    } catch (error) {
      console.error("Signup proxy error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process signup request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Authentication login proxy
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Proxying login request to Icona API");
      console.log("Login payload received:", {
        ...req.body,
        password: "[REDACTED]",
      });

      // Validate request body using schema
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { email, password } = validationResult.data;

      const { response, data: responseData } = await resilientFetch(
        `${ICONA_API_BASE}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      if (!response.ok) {
        const errorData = responseData as IconaApiErrorResponse;
        console.error("Icona API login error:", errorData);

        // Return the actual API message instead of friendly messages
        return res.status(response.status).json({
          success: false,
          message: errorData.message, // Use the actual API message
          error: errorData.message || "Login failed. Please try again.", // Fallback for compatibility
          details: errorData,
        });
      }

      // Validate the successful response
      const parseResult = iconaAuthResponseSchema.safeParse(responseData);
      if (!parseResult.success) {
        console.error("Invalid login response structure:", parseResult.error);
        return res.status(500).json({
          success: false,
          error: "Invalid response from authentication service",
        });
      }

      const data = parseResult.data;
      console.log("Login successful");

      // Store session data and return access token for header-based persistence
      req.session.user = data.data;
      req.session.accessToken = data.accessToken;

      res.json({
        success: true,
        data: data.data,
        accessToken: data.accessToken, // Return token for localStorage storage
        message: data.message,
      });
    } catch (error) {
      console.error("Login proxy error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process login request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Social authentication proxy (Google/Apple)
  app.post("/api/auth/social", async (req, res) => {
    try {
      console.log("Processing social auth with Firebase token verification");
      console.log("Social auth payload received:", {
        ...req.body,
        idToken: "[REDACTED]",
      });

      // Validate request body using schema
      const validationResult = socialAuthSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const socialAuthData = validationResult.data;

      // Verify Firebase ID token server-side for security
      console.log("Verifying Firebase ID token...");
      const decodedToken = await verifyFirebaseToken(socialAuthData.idToken);
      console.log("Firebase token verified successfully for UID:", decodedToken.uid);

      // Use the verified Firebase data as the authoritative source
      const verifiedSocialAuthData = {
        email: decodedToken.email || socialAuthData.email,
        firstName: socialAuthData.firstName,
        lastName: socialAuthData.lastName,
        userName: socialAuthData.userName,
        type: socialAuthData.type,
        profilePhoto: decodedToken.picture || socialAuthData.profilePhoto,
        country: socialAuthData.country,
        phone: socialAuthData.phone,
        gender: socialAuthData.gender,
      };

      const { response, data: responseData } = await resilientFetch(
        `${ICONA_API_BASE}/auth/social`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(verifiedSocialAuthData),
        },
      );

      if (!response.ok) {
        const errorData = responseData as IconaApiErrorResponse;
        console.error("Icona API social auth error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Social authentication failed",
          details: errorData,
        });
      }

      // Validate the successful response
      const parseResult = iconaAuthResponseSchema.safeParse(responseData);
      if (!parseResult.success) {
        console.error("Invalid social auth response structure:", parseResult.error);
        return res.status(500).json({
          success: false,
          error: "Invalid response from authentication service",
        });
      }

      const data = parseResult.data;
      console.log("Social auth successful");

      // Store session data and return access token for header-based persistence
      req.session.user = data.data;
      req.session.accessToken = data.accessToken;

      res.json({
        success: true,
        data: data.data,
        accessToken: data.accessToken, // Return token for localStorage storage
        message: data.message,
        newuser: data.newuser || false,
      });
    } catch (error) {
      console.error("Social auth proxy error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process social auth request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Social auth completion endpoint for new users
  app.post("/api/auth/social/complete", async (req, res) => {
    try {
      console.log("Proxying social auth completion request to Icona API");
      console.log("Social auth completion payload received:", req.body);

      // Use the completion schema for validation (doesn't require idToken)
      const validationResult = socialAuthCompleteSchema.safeParse({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        userName: req.body.userName,
        country: req.body.country,
        phone: req.body.phone,
        gender: req.body.gender,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const socialAuthData = {
        ...validationResult.data,
        email: req.body.email,
        type: req.body.type,
        profilePhoto: req.body.profilePhoto,
      };

      // Call auth endpoint with all user data
      const apiEndpoint = `${ICONA_API_BASE}/auth`;
      const { response, data: responseData } = await resilientFetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: socialAuthData.email,
          firstName: socialAuthData.firstName,
          lastName: socialAuthData.lastName,
          userName: socialAuthData.userName,
          country: socialAuthData.country,
          phone: socialAuthData.phone,
          gender: socialAuthData.gender,
          type: socialAuthData.type,
          profilePhoto: socialAuthData.profilePhoto
        }),
      });

      if (!response.ok) {
        const errorData = responseData as IconaApiErrorResponse;
        console.error("Icona API social auth completion error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: errorData.message || "Social authentication completion failed",
          details: errorData,
        });
      }

      // Validate the successful response
      const parseResult = iconaAuthResponseSchema.safeParse(responseData);
      if (!parseResult.success) {
        console.error("Invalid social auth completion response structure:", parseResult.error);
        return res.status(500).json({
          success: false,
          error: "Invalid response from authentication service",
        });
      }

      const data = parseResult.data;
      console.log("Social auth completion successful");

      // Update session data with the completed user info and return token
      req.session.user = data.data;
      req.session.accessToken = data.accessToken;

      res.json({
        success: true,
        data: data.data,
        accessToken: data.accessToken, // Return token for localStorage storage
        message: data.message || "Profile completed successfully",
      });
    } catch (error) {
      console.error("Social auth completion proxy error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process social auth completion request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Update user profile
  app.patch("/api/users/profile", async (req, res) => {
    try {
      const accessToken = req.session?.accessToken;
      
      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      const userId = req.session.user._id || req.session.user.id;
      const url = `${ICONA_API_BASE}/users/${userId}`;
      console.log(`Updating user profile at: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
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

      // Fetch fresh user data from /users/:id to ensure we have the latest
      console.log(`Fetching fresh user data from: ${url}`);
      const getUserResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!getUserResponse.ok) {
        const errorData = await getUserResponse.json().catch(() => ({}));
        console.error("Failed to fetch fresh user data:", errorData);
        // Fall back to update response if fetch fails
        const updateData = await response.json() as any;
        req.session.user = {
          ...req.session.user,
          ...updateData.data,
        };
        return res.json({
          success: true,
          data: updateData.data,
          message: "Profile updated successfully",
        });
      }

      const freshUserData = await getUserResponse.json() as any;
      
      // Update session with fresh user data
      req.session.user = {
        ...req.session.user,
        ...freshUserData.data,
      };

      // Return fresh user data to update localStorage
      res.json({
        success: true,
        data: freshUserData.data,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Send notification for mentions
  app.post("/notifications", async (req, res) => {
    try {
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      const { title, ids, message, screen, id, sender, senderName, senderphoto } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No recipient IDs provided",
        });
      }

      console.log(`Sending mention notifications to ${ids.length} users`);

      // Send notification via Icona API
      const url = `${ICONA_API_BASE}/notifications`;
      console.log(`Notification API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          ids,
          message,
          screen,
          id,
          sender,
          senderName,
          senderphoto
        })
      });

      console.log(`Notification API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Notification error response:", errorText);
        
        return res.status(response.status).json({
          success: false,
          error: "Failed to send notifications",
        });
      }

      const data = await response.json() as any;
      
      res.json({
        success: true,
        data: data,
        message: "Notifications sent successfully",
      });
    } catch (error) {
      console.error("Notification endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send notifications",
      });
    }
  });

  // Search users by username for mentions
  app.get("/users", async (req, res) => {
    try {
      const title = req.query.title as string;
      const page = req.query.page || '1';
      const limit = req.query.limit || '10';
      const accessToken = req.session?.accessToken;
      const currentUserId = req.session?.user?._id || req.session?.user?.id;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      if (!title || title.trim().length < 1) {
        return res.json({
          success: true,
          data: [],
          message: "Query too short",
        });
      }

      console.log(`Searching users with title: ${title}`);

      // Search users via Icona API with correct parameters
      const params = new URLSearchParams({
        page: page as string,
        limit: limit as string,
        title: title,
        currentUserId: currentUserId
      });
      const url = `${ICONA_API_BASE}/users?${params.toString()}`;
      console.log(`User search API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`User search API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("User search error response:", errorText);
        
        // Return empty array instead of error for better UX
        return res.json({
          success: true,
          data: [],
          message: "No users found",
        });
      }

      const data = await response.json() as any;
      
      // Return users array
      res.json({
        success: true,
        data: data.users || data.data || [],
        message: "Users retrieved successfully",
      });
    } catch (error) {
      console.error("User search endpoint error:", error);
      // Return empty array instead of error for better UX
      res.json({
        success: true,
        data: [],
        message: "Search failed",
      });
    }
  });

  // Get user data by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      let requestedUserId = req.params.id;

      // Check for session data instead of Authorization headers
      if (!req.session.user || !req.session.accessToken) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      const sessionUserId = req.session.user._id || req.session.user.id;

      // Handle special case: "me" resolves to current session user
      if (requestedUserId === "me") {
        requestedUserId = sessionUserId;
      }

      // Security check: Users can only access their own data
      if (requestedUserId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot access other user's data",
        });
      }

      // Return user data from session (no external API call needed)
      res.json({
        success: true,
        data: req.session.user,
        message: "User data retrieved successfully",
      });
    } catch (error) {
      console.error("User data retrieval error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to retrieve user data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get default payment method only
  app.get("/api/users/paymentmethod/default/:id", async (req, res) => {
    try {
      const requestedUserId = req.params.id;

      // Check for session data
      if (!req.session.user || !req.session.accessToken) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      const sessionUserId = req.session.user._id || req.session.user.id;
      const accessToken = req.session.accessToken;

      // Security check: Users can only access their own payment data
      if (requestedUserId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot access other user's payment data",
        });
      }

      console.log(`Fetching default payment method for user: ${requestedUserId}`);

      try {
        // Attempt to fetch default payment method from Icona API with timeout
        const { response, data: responseData } = await resilientFetch(
          `${ICONA_API_BASE}/stripe/default/paymentmethod/default/${requestedUserId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          // API responded successfully - return whatever it gave us (could be null if no default)
          console.log("Default payment method fetched from API:", responseData ? "EXISTS" : "NULL");
          return res.json(responseData);
        }
        
        console.warn(`API returned status ${response.status}, will return null`);
      } catch (apiError) {
        console.warn("API call failed:", 
          apiError instanceof Error ? apiError.message : String(apiError));
      }

      // If we get here, the API failed - return null
      console.log("No default payment method found");
      res.json(null);
    } catch (error) {
      console.error("Default payment method retrieval error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to retrieve default payment method",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get all payment methods for a user
  app.get("/api/users/paymentmethod/:id", async (req, res) => {
    try {
      const requestedUserId = req.params.id;

      // Check for session data
      if (!req.session.user || !req.session.accessToken) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      const sessionUserId = req.session.user._id || req.session.user.id;
      const accessToken = req.session.accessToken;

      // Security check: Users can only access their own payment data
      if (requestedUserId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot access other user's payment data",
        });
      }

      console.log(`Fetching all payment methods for user: ${requestedUserId}`);

      // Fetch all payment methods from Icona API
      const { response, data: responseData } = await resilientFetch(
        `${ICONA_API_BASE}/users/paymentmethod/${requestedUserId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error(`Icona API error fetching payment methods ${requestedUserId}:`, responseData);
        return res.status(response.status).json({
          success: false,
          error: (responseData as any)?.message || "Failed to fetch payment methods",
        });
      }

      // Return all payment methods (should be an array)
      const paymentMethods = Array.isArray(responseData) ? responseData : [];
      
      console.log("Payment methods fetched:", paymentMethods.length, "methods");

      res.json(paymentMethods);
    } catch (error) {
      console.error("Payment method retrieval error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to retrieve payment methods",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Follow user endpoint
  app.put("/api/follow/:myId/:tofollowId", async (req, res) => {
    try {
      const { myId, tofollowId } = req.params;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (myId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot follow on behalf of another user",
        });
      }

      console.log(`Following user: ${myId} -> ${tofollowId}`);

      const url = `${ICONA_API_BASE}/users/follow/${myId}/${tofollowId}`;
      console.log(`Follow API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Follow API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Follow error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to follow user (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully followed user",
      });
    } catch (error) {
      console.error("Follow endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to follow user",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Unfollow user endpoint
  app.put("/api/unfollow/:myId/:tofollowId", async (req, res) => {
    try {
      const { myId, tofollowId } = req.params;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (myId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot unfollow on behalf of another user",
        });
      }

      console.log(`Unfollowing user: ${myId} -> ${tofollowId}`);

      const url = `${ICONA_API_BASE}/users/unfollow/${myId}/${tofollowId}`;
      console.log(`Unfollow API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Unfollow API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Unfollow error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to unfollow user (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully unfollowed user",
      });
    } catch (error) {
      console.error("Unfollow endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to unfollow user",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Block user endpoint
  app.put("/api/block/:myId/:toBlock", async (req, res) => {
    try {
      const { myId, toBlock } = req.params;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (myId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot block on behalf of another user",
        });
      }

      console.log(`Blocking user: ${myId} -> ${toBlock}`);

      const url = `${ICONA_API_BASE}/users/block/${myId}/${toBlock}`;
      console.log(`Block API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Block API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Block error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to block user (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully blocked user",
      });
    } catch (error) {
      console.error("Block endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to block user",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Unblock user endpoint
  app.put("/api/unblock/:myId/:toBlock", async (req, res) => {
    try {
      const { myId, toBlock } = req.params;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (myId !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot unblock on behalf of another user",
        });
      }

      console.log(`Unblocking user: ${myId} -> ${toBlock}`);

      const url = `${ICONA_API_BASE}/users/unblock/${myId}/${toBlock}`;
      console.log(`Unblock API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Unblock API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Unblock error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to unblock user (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully unblocked user",
      });
    } catch (error) {
      console.error("Unblock endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to unblock user",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Report user endpoint
  app.post("/api/report", async (req, res) => {
    try {
      const { reason, reported_by, reported } = req.body;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (reported_by !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot report on behalf of another user",
        });
      }

      if (!reason || !reported) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: reason and reported user ID",
        });
      }

      console.log(`Reporting user: ${reported_by} reporting ${reported} for: ${reason}`);

      const url = `${ICONA_API_BASE}/users/report`;
      console.log(`Report API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          reported_by,
          reported,
        }),
      });

      console.log(`Report API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Report error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to report user (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully reported user",
      });
    } catch (error) {
      console.error("Report endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to report user",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Category follow endpoint
  app.put("/api/category/follow/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { userid } = req.body;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (userid !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot follow category on behalf of another user",
        });
      }

      if (!categoryId || !userid) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: category ID and user ID",
        });
      }

      console.log(`Following category: User ${userid} following category ${categoryId}`);

      const url = `${ICONA_API_BASE}/category/follow/${categoryId}`;
      console.log(`Category follow API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userid,
        }),
      });

      console.log(`Category follow API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Category follow error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to follow category (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully followed category",
      });
    } catch (error) {
      console.error("Category follow endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to follow category",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Category unfollow endpoint
  app.put("/api/category/unfollow/:id", async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { userid } = req.body;
      const accessToken = req.session?.accessToken;

      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No active session found",
        });
      }

      // Verify the requesting user matches the session
      const sessionUserId = req.session.user._id || req.session.user.id;
      if (userid !== sessionUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Cannot unfollow category on behalf of another user",
        });
      }

      if (!categoryId || !userid) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: category ID and user ID",
        });
      }

      console.log(`Unfollowing category: User ${userid} unfollowing category ${categoryId}`);

      const url = `${ICONA_API_BASE}/category/unfollow/${categoryId}`;
      console.log(`Category unfollow API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userid,
        }),
      });

      console.log(`Category unfollow API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Category unfollow error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to unfollow category (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        data: data.data || data,
        message: data.message || "Successfully unfollowed category",
      });
    } catch (error) {
      console.error("Category unfollow endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to unfollow category",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // User reviews endpoint
  app.get("/api/users/review/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      console.log(`Fetching reviews for user: ${userId}`);

      const url = `${ICONA_API_BASE}/users/review/${userId}`;
      console.log(`Reviews API URL: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(`Reviews API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Reviews fetch error response:", errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        return res.status(response.status).json({
          success: false,
          error: errorData.message || `Failed to fetch reviews (API returned ${response.status})`,
          details: errorData,
        });
      }

      const data = await response.json() as any;
      res.json({
        success: true,
        reviews: data.data || [],
      });
    } catch (error) {
      console.error("Reviews endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch reviews",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({
            success: false,
            error: "Failed to logout",
          });
        }

        // Clear the session cookie
        res.clearCookie("sessionId");
        res.json({
          success: true,
          message: "Logged out successfully",
        });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to logout",
      });
    }
  });

  // Check if user exists by email
  app.get("/api/users/userexists/email", async (req, res) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          error: "Email parameter is required",
        });
      }

      console.log("Checking if user exists with email:", email);

      // Use login attempt with dummy password to check user existence
      const checkPayload = {
        email: email,
        password: "dummy-password-for-existence-check-12345",
      };

      const { response, data } = await resilientFetch(`${ICONA_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkPayload),
      });

      console.log("User existence check response status:", response.status);
      console.log("User existence check response data:", data);

      if (response.ok) {
        // User exists (successful login would mean user exists)
        res.json({
          success: true,
          exists: true,
          message: "User exists",
        });
      } else if (response.status === 400 || response.status === 401 || response.status === 422) {
        // Check the error message to determine if user exists but password is wrong
        const errorMessage = (data as any)?.message || (data as any)?.error || "";
        console.log("User existence check error message:", errorMessage);

        // User not found messages
        if (errorMessage.toLowerCase().includes("user not found") || 
            errorMessage.toLowerCase().includes("user does not exist") ||
            errorMessage.toLowerCase().includes("no user found")) {
          // User definitely doesn't exist
          res.json({
            success: true,
            exists: false,
            message: "User does not exist",
          });
        } else {
          // User exists but password is wrong (or other validation error)
          // Common messages: "invalid password", "incorrect password", "wrong password"
          res.json({
            success: true,
            exists: true,
            message: "User exists",
          });
        }
      } else if (response.status === 500) {
        // Server error - check error message more carefully
        const errorMessage = (data as any)?.message || (data as any)?.error || "";
        console.log("500 error message:", errorMessage);
        
        if (errorMessage.toLowerCase().includes("user not found") || 
            errorMessage.toLowerCase().includes("user does not exist")) {
          res.json({
            success: true,
            exists: false,
            message: "User does not exist",
          });
        } else {
          // For other 500 errors, assume user exists to be safe
          // (avoid creating duplicate accounts)
          res.json({
            success: true,
            exists: true,
            message: "User exists (unable to verify)",
          });
        }
      } else {
        // Other error - assume user exists for safety to avoid duplicate accounts
        res.json({
          success: true,
          exists: true,
          message: "User exists (unable to verify)",
        });
      }
    } catch (error) {
      console.error("User existence check error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to check user existence",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Admin login proxy - uses different Icona API endpoint
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      console.log("Proxying admin login request to Icona API");
      console.log("Admin login payload received:", {
        ...req.body,
        password: "[REDACTED]",
      });

      // Validate request body using schema
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { email, password } = validationResult.data;

      // Call the admin/login endpoint instead of auth/login
      const { response, data: responseData } = await resilientFetch(
        `${ICONA_API_BASE}/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      if (!response.ok) {
        const errorData = responseData as IconaApiErrorResponse;
        console.error("Icona API admin login error:", errorData);

        // Return the actual API message
        return res.status(response.status).json({
          success: false,
          message: errorData.message,
          error: errorData.message || "Admin login failed. Please try again.",
          details: errorData,
        });
      }

      // Log the raw response for debugging
      console.log("Admin login raw response:", JSON.stringify(responseData).substring(0, 500));

      // Admin endpoint returns different structure: { user, accesstoken } instead of { data, accessToken }
      // Transform to match expected schema
      const adminResponse = responseData as any;
      const normalizedResponse = {
        success: adminResponse.success,
        data: adminResponse.user || adminResponse.data,
        accessToken: adminResponse.accesstoken || adminResponse.accessToken,
        message: adminResponse.message || "Admin login successful"
      };

      // Validate the normalized response
      const parseResult = iconaAuthResponseSchema.safeParse(normalizedResponse);
      if (!parseResult.success) {
        console.error("Invalid admin login response structure:", parseResult.error);
        console.error("Raw response data:", JSON.stringify(responseData).substring(0, 500));
        return res.status(500).json({
          success: false,
          error: "Invalid response from authentication service",
        });
      }

      const data = parseResult.data;
      console.log("Admin login successful, user data:", data.data ? "present" : "missing");

      // Store session data and explicitly mark as admin since they logged in via admin endpoint
      req.session.user = {
        ...data.data,
        admin: true,  // Explicitly set admin flag for admin login
        role: data.data?.role || 'admin'  // Preserve role from API or default to 'admin'
      };
      req.session.accessToken = data.accessToken;

      console.log("Session user set with admin flag:", req.session.user?.admin);
      console.log("Session user role:", req.session.user?.role);

      res.json({
        success: true,
        data: {
          ...data.data,
          admin: true,
          role: data.data?.role || 'admin'
        },
        accessToken: data.accessToken, // Return token to frontend for storage
        message: data.message,
      });
    } catch (error) {
      console.error("Admin login proxy error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process admin login request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user transactions
  app.get("/api/user/transactions", async (req, res) => {
    try {
      const accessToken = req.session?.accessToken;
      
      if (!accessToken || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: "No access token found",
        });
      }

      const userId = req.session.user._id || req.session.user.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const queryParams = new URLSearchParams();
      queryParams.append("userId", userId);
      if (req.query.page) queryParams.append("page", req.query.page as string);
      if (req.query.limit) queryParams.append("limit", req.query.limit as string);
      if (req.query.status) queryParams.append("status", req.query.status as string);

      const url = `${ICONA_API_BASE}/transactions?${queryParams.toString()}`;
      console.log(`Fetching user transactions from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`User transactions API response status: ${response.status}`);
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

      const data = await response.json() as any;

      if (!response.ok) {
        console.error(`User transactions API error:`, data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Failed to fetch transactions",
          details: data,
        });
      }

      // Debug: Log response structure
      console.log('External API response keys:', Object.keys(data));
      console.log('Has pages:', 'pages' in data);
      console.log('Has total:', 'total' in data);
      console.log('Pages value:', data.pages);
      console.log('Total value:', data.total);

      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transactions",
        details: error.message,
      });
    }
  });

  // Public settings endpoint for fee percentages (requires authentication)
  app.get("/api/public/settings", async (req, res) => {
    try {
      const accessToken = req.session?.accessToken;
      
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const url = `${ICONA_API_BASE}/admin/app/settings`;
      console.log(`Fetching public settings from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Public settings API error: ${response.status}`);
        return res.status(response.status).json({
          success: false,
          error: "Failed to fetch settings",
        });
      }

      const data = await response.json();
      const settings = Array.isArray(data) ? data[0] : data;

      // Return only non-sensitive settings
      res.json({
        success: true,
        data: {
          stripe_fee: settings?.stripe_fee || '0',
          extra_charges: settings?.extra_charges || '0',
          support_email: settings?.support_email || 'support@icona.com',
        },
      });
    } catch (error: any) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch settings",
        details: error.message,
      });
    }
  });

  // Session validation endpoint
  app.get("/api/auth/session", (req, res) => {
    // Check if token is provided in header for session restoration
    const tokenFromHeader = req.headers['x-admin-token'];
    
    // If session exists, return it
    if (req.session?.user) {
      return res.json({
        success: true,
        data: req.session.user,
      });
    }
    
    // If no session but token exists, try to restore from localStorage user data
    if (tokenFromHeader && req.headers['x-admin-user']) {
      try {
        const userDataHeader = req.headers['x-admin-user'] as string;
        // Decode from base64 (UTF-8)
        const decoded = Buffer.from(userDataHeader, 'base64').toString('utf8');
        const userData = JSON.parse(decoded);
        // Restore session
        req.session.user = userData;
        req.session.accessToken = tokenFromHeader as string;
        
        return res.json({
          success: true,
          data: userData,
        });
      } catch (error) {
        console.error('Failed to parse user data from header:', error);
      }
    }
    
    return res.status(401).json({
      success: false,
      error: "No active session",
    });
  });
}