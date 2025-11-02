import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";

export function registerPaymentMethodRoutes(app: Express) {
  // Get all payment methods for a user
  app.get("/users/paymentmethod/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ 
          error: "User ID is required" 
        });
      }
      
      console.log('Fetching payment methods for user:', userId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API
      const response = await fetch(`${ICONA_API_BASE}/users/paymentmethod/${userId}`, {
        method: 'GET',
        headers,
      });
      
      const responseText = await response.text();
      console.log('Get payment methods response status:', response.status);
      
      if (!response.ok) {
        console.error(`Icona API get payment methods error ${response.status}`);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to get payment methods",
            details: responseText,
          });
        }
      }
      
      const data = responseText ? JSON.parse(responseText) : [];
      res.json(data);
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ 
        error: "Failed to get payment methods", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete payment method
  app.delete("/stripe/remove", async (req, res) => {
    try {
      const { paymentMethodId, userid } = req.body;
      
      if (!paymentMethodId || !userid) {
        return res.status(400).json({ 
          error: "Payment method ID and user ID are required" 
        });
      }
      
      console.log('Deleting payment method:', { paymentMethodId, userid });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API
      const response = await fetch(`${ICONA_API_BASE}/stripe/remove`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ paymentMethodId, userid })
      });
      
      const responseText = await response.text();
      console.log('Delete payment method response status:', response.status);
      
      if (!response.ok) {
        console.error(`Icona API delete error ${response.status}`);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to delete payment method",
            details: responseText,
          });
        }
      }
      
      const data = responseText ? JSON.parse(responseText) : {};
      res.json(data);
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ 
        error: "Failed to delete payment method", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Set default payment method
  app.put("/stripe/default", async (req, res) => {
    try {
      const { userid, paymentMethodId } = req.body;
      
      if (!paymentMethodId || !userid) {
        return res.status(400).json({ 
          error: "User ID and payment method ID are required" 
        });
      }
      
      console.log('Setting default payment method:', { userid, paymentMethodId });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API
      const response = await fetch(`${ICONA_API_BASE}/stripe/default`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ userid, paymentMethodId })
      });
      
      const responseText = await response.text();
      console.log('Set default payment method response status:', response.status);
      
      if (!response.ok) {
        console.error(`Icona API set default error ${response.status}`);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to set default payment method",
            details: responseText,
          });
        }
      }
      
      const data = responseText ? JSON.parse(responseText) : {};
      res.json(data);
    } catch (error) {
      console.error('Set default payment method error:', error);
      res.status(500).json({ 
        error: "Failed to set default payment method", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add/Update payment method
  app.post("/api/payment-methods", async (req, res) => {
    try {
      const { paymentMethodId, userId } = req.body;
      
      if (!paymentMethodId || !userId) {
        return res.status(400).json({ 
          error: "Payment method ID and user ID are required" 
        });
      }
      
      console.log('Adding payment method via Icona API:', { paymentMethodId, userId });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API
      const response = await fetch(`${ICONA_API_BASE}/users/paymentmethod`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentMethodId,
          userId,
        })
      });
      
      const responseText = await response.text();
      console.log('Icona API response status:', response.status);
      console.log('Icona API response body:', responseText);
      
      if (!response.ok) {
        console.error(`Icona API error ${response.status}:`, responseText);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to add payment method",
            details: responseText,
          });
        }
      }
      
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      console.error('Add payment method error:', error);
      res.status(500).json({ 
        error: "Failed to add payment method", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stripe setup intent endpoint
  app.post("/stripe/setupitent", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ 
          error: "Email is required" 
        });
      }
      
      console.log('Creating Stripe setup intent for email:', email);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API stripe setup intent endpoint
      const response = await fetch(`${ICONA_API_BASE}/stripe/setupitent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim() })
      });
      
      const responseText = await response.text();
      console.log('Stripe setup intent response status:', response.status);
      // Do not log response body as it contains sensitive clientSecret
      
      if (!response.ok) {
        console.error(`Stripe setup intent API error ${response.status}`);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to create setup intent",
            details: responseText,
          });
        }
      }
      
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      console.error('Stripe setup intent error:', error);
      res.status(500).json({ 
        error: "Failed to create setup intent", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stripe-specific endpoint for saving payment method
  app.post("/stripe/savepaymentmethod", async (req, res) => {
    try {
      const { customer_id, methodid, userid } = req.body;
      
      // Validate and trim required fields (methodid is optional - only used when editing)
      const trimmedCustomerId = typeof customer_id === 'string' ? customer_id.trim() : '';
      const trimmedUserId = typeof userid === 'string' ? userid.trim() : '';
      const trimmedMethodId = methodid && typeof methodid === 'string' ? methodid.trim() : undefined;
      
      if (!trimmedUserId || !trimmedCustomerId) {
        return res.status(400).json({ 
          error: "Customer ID and user ID are required and must be non-empty" 
        });
      }
      
      console.log('Saving Stripe payment method:', { 
        customer_id: trimmedCustomerId, 
        methodid: trimmedMethodId || 'none (adding new)', 
        userid: trimmedUserId 
      });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Send to Icona API stripe endpoint
      const payload: any = {
        customer_id: trimmedCustomerId,
        userid: trimmedUserId,
      };
      
      // Only include methodid if it's provided (when editing/replacing)
      if (trimmedMethodId) {
        payload.methodid = trimmedMethodId;
      }
      
      const response = await fetch(`${ICONA_API_BASE}/stripe/savepaymentmethod`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      console.log('Stripe save payment method response status:', response.status);
      // Do not log response body as it may contain sensitive payment data
      
      if (!response.ok) {
        console.error(`Stripe API error ${response.status}`);
        
        try {
          const errorJson = JSON.parse(responseText);
          const apiMessage = errorJson.message || errorJson.error || errorJson;
          
          return res.status(response.status).json({ 
            error: apiMessage,
            details: errorJson,
          });
        } catch (e) {
          return res.status(response.status).json({ 
            error: responseText || "Failed to save payment method",
            details: responseText,
          });
        }
      }
      
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      console.error('Save Stripe payment method error:', error);
      res.status(500).json({ 
        error: "Failed to save payment method", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
