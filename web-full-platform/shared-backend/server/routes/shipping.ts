import type { Express } from "express";
import fetch from "node-fetch";
import https from 'https';
import { URL } from 'url';
import { ICONA_API_BASE } from "../utils";
import type { 
  IconaOrdersResponse, 
  ShippingEstimateRequest, 
  ShippingEstimateResponse,
  ShippingLabelPurchaseRequest,
  ShippingLabelPurchaseResponse,
  BundleLabelPurchaseRequest,
  BundleLabelPurchaseResponse,
  IconaOrder
} from "../../shared/schema";
import { 
  shippingEstimateRequestSchema,
  shippingEstimateResponseSchema,
  shippingLabelPurchaseRequestSchema,
  bundleLabelPurchaseRequestSchema
} from "../../shared/schema";

// Utility function to make GET requests with body using https.request
function makeGetWithBody(url: string, payload: any, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = JSON.stringify(payload);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString(),
        ...headers
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

export function registerShippingRoutes(app: Express) {
  // Shipping profiles for user
  app.get("/api/shipping/profiles/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Proxying shipping profiles request to Icona API for user:', userId);
      
      // Build the URL for the external API
      const url = `${ICONA_API_BASE}/shipping/profiles/${userId}`;
      console.log('Final API URL being called:', url);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Icona API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Shipping profiles proxy error:', error);
      res.status(500).json({ error: "Failed to fetch shipping profiles from Icona API" });
    }
  });

  // Create shipping profile
  app.post("/api/shipping/profiles/:id", async (req, res) => {
    try {
      const { id: userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      console.log('Creating shipping profile via Icona API for user:', userId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/shipping/profiles/${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        throw new Error(`Icona API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Create shipping profile error:', error);
      res.status(500).json({ error: "Failed to create shipping profile" });
    }
  });

  // Update shipping profile
  app.put("/api/shipping/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('Updating shipping profile via Icona API:', id);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/shipping/profiles/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        throw new Error(`Icona API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Update shipping profile error:', error);
      res.status(500).json({ error: "Failed to update shipping profile" });
    }
  });

  // Delete shipping profile
  app.delete("/api/shipping/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('Deleting shipping profile via Icona API:', id);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/shipping/profiles/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Icona API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Delete shipping profile error:', error);
      res.status(500).json({ error: "Failed to delete shipping profile" });
    }
  });

  // Shipping metrics
  app.get("/api/shipping/metrics", async (req, res) => {
    try {
      const { userId, customer } = req.query;
      
      if (!userId && !customer) {
        return res.status(400).json({ error: "userId or customer parameter is required" });
      }

      // Fetch orders from external API to calculate metrics
      const queryParams = new URLSearchParams();
      if (customer) {
        queryParams.set('customer', customer as string);
      } else if (userId) {
        queryParams.set('userId', userId as string);
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`External API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as IconaOrdersResponse;
      const orders = data.orders || [];
      
      

      // Calculate items revenue only (excluding shipping and service fees)
      const totalSoldFromItems = orders.reduce((sum, order) => {
        // Calculate actual subtotal from item quantities and prices
        const itemsSubtotal = order.items 
          ? order.items.reduce((itemSum, item) => {
              const quantity = item.quantity || 0;
              const price = item.price || 0;
              return itemSum + (quantity * price);
            }, 0)
          : 0;
        
        const tax = order.tax || 0;
        
        // Items revenue includes only items + tax (not shipping or service fees)
        const itemsTotal = itemsSubtotal + tax;
        return sum + itemsTotal;
      }, 0);
      
      // Calculate total shipping costs (all orders) 
      const totalShippingCosts = orders.reduce((sum, order) => sum + (order.shipping_fee || 0), 0);
      
      // Calculate total service fees (all orders)
      const totalServiceFees = orders.reduce((sum, order) => sum + (order.servicefee || 0), 0);
      
      // Calculate total shipping spend that seller pays (only for processing orders)
      const totalShippingSpend = orders
        .filter(order => order.status === 'processing')
        .reduce((sum, order) => sum + (order.seller_shipping_fee_pay || 0), 0);
      
      const totalCouponSpend = 0; // No coupon data in current schema
      const totalEarned = totalSoldFromItems - totalShippingSpend - totalServiceFees - totalCouponSpend;
      
      
      const itemsSold = orders.reduce((sum, order) => {
        const itemCount = order.items ? order.items.reduce((total, item) => total + (item.quantity || 1), 0) : 1;
        return sum + itemCount;
      }, 0);
      
      const totalDelivered = orders.filter(order => order.status === "delivered" || order.status === "ended").length;
      const pendingDelivery = orders.filter(order => order.status === "shipping" || order.status === "shipped").length;

      const metrics = {
        totalSold: totalSoldFromItems.toFixed(2),
        totalEarned: totalEarned.toFixed(2),
        totalShippingSpend: totalShippingSpend.toFixed(2),
        totalCouponSpend: totalCouponSpend.toFixed(2),
        itemsSold,
        totalDelivered,
        pendingDelivery,
      };

      res.json(metrics);
    } catch (error) {
      console.error('Shipping metrics error:', error);
      res.status(500).json({ error: "Failed to fetch shipping metrics" });
    }
  });

  // Simple shipping estimate (for auction started events)
  app.post("/api/shipping/estimate", async (req, res) => {
    try {
      console.log('Fetching shipping estimate for auction:', req.body);
      
      const requestBody = {
        weight: req.body.weight,
        unit: req.body.unit,
        product: req.body.product,
        update: req.body.update,
        owner: req.body.owner,
        customer: req.body.customer,
        tokshow: req.body.tokshow,
        buying_label: true,
      };

      const estimate = await makeGetWithBody(`${ICONA_API_BASE}/shipping/profiles/estimate/rates`, requestBody);
      console.log('Shipping estimate response:', estimate);
      
      res.json(estimate);
    } catch (error) {
      console.error('Shipping estimate error:', error);
      res.status(500).json({ error: "Failed to get shipping estimate" });
    }
  });

  // Shipping estimates
  app.post("/api/shipping/profiles/estimate/rates", async (req, res) => {
    try {
      // Parse request body and validate using Zod schema
      const validatedData = shippingEstimateRequestSchema.parse(req.body);

      console.log('Fetching shipping estimates from external API:', `${ICONA_API_BASE}/shipping/profiles/estimate/rates`);
      
      // Send data in request body using GET method with https.request
      const requestBody = {
        weight: validatedData.weight,
        unit: validatedData.unit,
        product: validatedData.product,
        update: validatedData.update,
        owner: validatedData.owner,
        customer: validatedData.customer,
        length: validatedData.length,
        width: validatedData.width,
        height: validatedData.height,
        buying_label: true,
      };

      const rawEstimate = await makeGetWithBody(`${ICONA_API_BASE}/shipping/profiles/estimate/rates`, requestBody);
      console.log('External API shipping estimates:', rawEstimate);
      
      // Transform single estimate object into array format expected by frontend
      const estimates = Array.isArray(rawEstimate) ? rawEstimate : [rawEstimate];
      
      // Transform API response format to match frontend expectations
      const transformedEstimates = estimates.map((estimate: any) => {
        const transformed = {
          // Include original data for reference first
          ...estimate,
          // Then override with normalized fields
          carrier: estimate.provider || 'Unknown',
          service: estimate.servicelevel?.name || 'Standard',
          price: estimate.amount || '0.00',
          deliveryTime: estimate.durationTerms || 'Standard delivery',
          estimatedDays: estimate.estimatedDays || 3,
          objectId: typeof estimate.objectId === 'string' ? estimate.objectId.trim() : '',
        };
        
        // Validate against schema to ensure objectId is present
        try {
          shippingEstimateResponseSchema.parse(transformed);
          return transformed;
        } catch (validationError) {
          console.error('Invalid estimate response - missing objectId:', estimate);
          // Skip estimates without valid objectId
          return null;
        }
      }).filter(Boolean);
      
      if (transformedEstimates.length === 0) {
        return res.status(500).json({ 
          error: "No valid shipping estimates available", 
          message: "Unable to get valid shipping rates. Please check package details and try again." 
        });
      }
      
      res.json(transformedEstimates);
    } catch (error) {
      console.error('Shipping estimates error:', error);
      
      // If it's a Zod validation error, return 400
      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({ 
          error: "Invalid shipping data", 
          message: "Missing or invalid weight/dimensions data", 
          details: error.message 
        });
      }
      
      // For calculation errors or other issues, return 500
      res.status(500).json({ 
        error: "Failed to calculate shipping estimates", 
        message: "Unable to calculate shipping costs. Please check package details." 
      });
    }
  });

  // Purchase shipping label
  app.post("/api/shipping/profiles/buy/label", async (req, res) => {
    try {
      // Validate request body using Zod schema
      const validatedData = shippingLabelPurchaseRequestSchema.parse(req.body);
      
      console.log('Processing shipping label purchase:', {
        rate_id: validatedData.rate_id,
        order: validatedData.order,
        carrier: validatedData.carrier,
        servicelevel: validatedData.servicelevel,
        shipping_fee: validatedData.shipping_fee,
        label_file_type: (req.body as any).label_file_type
      });

      // Fetch the order to check if it has a bundleId
      // Note: If the order ID is already a bundle ID, this will fail gracefully
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        fetchHeaders['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      let orderIdToSend = validatedData.order;

      try {
        const orderResponse = await fetch(`${ICONA_API_BASE}/orders/${validatedData.order}`, {
          method: 'GET',
          headers: fetchHeaders
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json() as any;
          // If order has a bundleId, use that instead
          if (orderData && orderData.bundleId) {
            orderIdToSend = orderData.bundleId;
            console.log(`Order ${validatedData.order} belongs to bundle ${orderData.bundleId}, using bundle ID`);
          }
        } else {
          console.log(`Could not fetch order ${validatedData.order} (might already be a bundle ID), using as-is`);
        }
      } catch (fetchError) {
        console.log(`Error fetching order ${validatedData.order}, using order ID as provided:`, fetchError);
      }

      // Build rates array format expected by external API
      const rates = [{
        rate_id: validatedData.rate_id,
        label_file_type: (req.body as any).label_file_type || 'PDF_4x6',
        order: orderIdToSend
      }];

      console.log('Calling external shipping API:', `${ICONA_API_BASE}/shipping/profiles/buy/label`);
      console.log('Request body being sent to external API:', { rates });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/shipping/profiles/buy/label`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rates })
      });

      console.log(`External API response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('External API error response:', errorText);
        
        let errorMessage = 'Failed to purchase label';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        return res.status(response.status).json({
          success: false,
          message: errorMessage,
          error: errorText
        } as ShippingLabelPurchaseResponse);
      }

      const apiResponseData = await response.json() as any;
      console.log('External API response data:', apiResponseData);

      // Extract result from results array (first item for single label purchase)
      const result = apiResponseData.results?.[0];
      
      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'No label data returned from API'
        } as ShippingLabelPurchaseResponse);
      }

      // Transform external API response to match frontend expectations
      const transformedResponse: ShippingLabelPurchaseResponse = {
        success: true,
        data: {
          tracking_number: result.tracking_number || '',
          cost: validatedData.shipping_fee.toString(),
          carrier: validatedData.carrier || 'Unknown',
          service: validatedData.servicelevel || 'Standard',
          label_url: result.label || '',
          delivery_time: 'Standard delivery',
          purchased_at: new Date().toISOString(),
        },
        message: 'Label purchased successfully'
      };

      res.status(200).json(transformedResponse);

    } catch (error) {
      console.error('Shipping label purchase error:', error);
      
      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid request data for label purchase",
          error: error.message
        } as ShippingLabelPurchaseResponse);
      }

      // Handle other errors
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: "Failed to purchase shipping label",
          error: error.message
        } as ShippingLabelPurchaseResponse);
      }

      // Fallback error response
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred while purchasing the shipping label",
        error: "Internal server error"
      } as ShippingLabelPurchaseResponse);
    }
  });

  // Purchase shipping label for bundle (multiple orders)
  app.post("/api/shipping/labels/bundle", async (req, res) => {
    try {
      // Validate request body using Zod schema
      const validatedData = bundleLabelPurchaseRequestSchema.parse(req.body);
      const { orderIds, service, rate_id } = validatedData;

      console.log('Processing bundle label purchase for orders:', orderIds);

      // Fetch all orders to validate and aggregate data
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        fetchHeaders['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const orderFetchPromises = orderIds.map(async (orderId: string) => {
        const response = await fetch(`${ICONA_API_BASE}/orders/${orderId}`, {
          method: 'GET',
          headers: fetchHeaders
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch order ${orderId}: ${response.status} ${response.statusText}`);
        }
        
        return response.json() as Promise<IconaOrder>;
      });

      const orders = await Promise.all(orderFetchPromises);
      console.log(`Fetched ${orders.length} orders for bundling`);

      // Validate orders belong to same customer and have same shipping address
      const firstOrder = orders[0];
      const customerId = firstOrder.customer._id;
      const customerAddress = firstOrder.customer.address;

      if (!customerAddress) {
        return res.status(400).json({
          success: false,
          message: "First order has no shipping address",
          error: "Cannot bundle orders without shipping address"
        } as BundleLabelPurchaseResponse);
      }

      for (const order of orders) {
        // Validate same customer
        if (order.customer._id !== customerId) {
          return res.status(400).json({
            success: false,
            message: "All orders must belong to the same customer",
            error: `Order ${order._id} belongs to different customer`
          } as BundleLabelPurchaseResponse);
        }

        // Validate same shipping address
        const orderAddress = order.customer.address;
        if (!orderAddress || 
            orderAddress.addrress1 !== customerAddress.addrress1 || 
            orderAddress.city !== customerAddress.city ||
            orderAddress.state !== customerAddress.state ||
            orderAddress.zipcode !== customerAddress.zipcode) {
          return res.status(400).json({
            success: false,
            message: "All orders must have the same shipping address",
            error: `Order ${order._id} has different shipping address`
          } as BundleLabelPurchaseResponse);
        }

        // Validate order status is compatible for shipping
        const validStatuses = ['pending', 'processing', 'unfulfilled', 'ready_to_ship'];
        if (order.status && !validStatuses.includes(order.status)) {
          return res.status(400).json({
            success: false,
            message: `Order ${order._id} has incompatible status: ${order.status}`,
            error: "Orders must have compatible status for bundling"
          } as BundleLabelPurchaseResponse);
        }
      }

      // Aggregate weight and dimensions server-side
      let totalWeightOz = 0;
      let maxLength = 0;
      let maxWidth = 0;
      let totalHeight = 0;

      for (const order of orders) {
        // Get weight from giveaway shipping profile or items
        let orderWeight = 0;
        if (order.giveaway?.shipping_profile?.weight) {
          const weight = order.giveaway.shipping_profile.weight;
          const scale = order.giveaway.shipping_profile.scale?.toLowerCase() || 'oz';
          orderWeight = scale === 'lb' ? weight * 16 : weight; // Convert to oz
        } else if (order.items) {
          // Sum weights from individual items
          for (const item of order.items) {
            if (item.weight) {
              const itemWeight = parseFloat(item.weight);
              const itemScale = item.scale?.toLowerCase() || 'oz';
              const weightInOz = itemScale === 'lb' ? itemWeight * 16 : itemWeight;
              orderWeight += weightInOz * (item.quantity || 1);
            }
          }
        }
        totalWeightOz += orderWeight;

        // Get dimensions from giveaway or items
        let orderLength = 0, orderWidth = 0, orderHeight = 0;
        if (order.giveaway) {
          orderLength = parseFloat(order.giveaway.length || '0');
          orderWidth = parseFloat(order.giveaway.width || '0');
          orderHeight = parseFloat(order.giveaway.height || '0');
        } else if (order.items && order.items.length > 0) {
          // Use dimensions from first item as approximation
          const firstItem = order.items[0];
          orderLength = parseFloat(firstItem.length || '0');
          orderWidth = parseFloat(firstItem.width || '0');
          orderHeight = parseFloat(firstItem.height || '0');
        }

        // Aggregate dimensions (max length/width, sum height for stacking)
        maxLength = Math.max(maxLength, orderLength);
        maxWidth = Math.max(maxWidth, orderWidth);
        totalHeight += orderHeight;
      }

      // Set minimum dimensions if none provided
      if (maxLength === 0) maxLength = 12; // 12 inches default
      if (maxWidth === 0) maxWidth = 12;   // 12 inches default  
      if (totalHeight === 0) totalHeight = 4; // 4 inches default
      if (totalWeightOz === 0) totalWeightOz = 8; // 8 oz default

      const aggregatedWeight = `${totalWeightOz}`;
      const aggregatedDimensions = `${maxLength}x${maxWidth}x${totalHeight}`;

      console.log('Aggregated parcel data:', {
        weight: `${totalWeightOz} oz`,
        dimensions: aggregatedDimensions,
        orders: orderIds.length
      });

      // Create aggregate order object for label purchase
      const aggregateOrder = {
        _id: `bundle_${orderIds.join('_')}`,
        customer: firstOrder.customer,
        seller: firstOrder.seller,
        items: orderIds.map((id: string) => ({ _id: id, bundled: true }))
      };

      // Calculate estimated shipping cost (this should ideally come from rate_id validation)
      const estimatedCost = Math.max(5.99, totalWeightOz * 0.15); // Basic estimation

      // Prepare label purchase request using rates array format
      const bundleId = `bundle_${orderIds.join('_')}`;
      const rates = [{
        rate_id: rate_id,
        label_file_type: 'PDF_4x6',  // Default format for bundles
        order: bundleId
      }];

      console.log('Creating bundle label with Icona API');
      console.log('Bundle request:', { rates });
      
      const labelHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        labelHeaders['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Purchase label from external API
      const labelResponse = await fetch(`${ICONA_API_BASE}/shipping/profiles/buy/label`, {
        method: 'POST',
        headers: labelHeaders,
        body: JSON.stringify({ rates })
      });

      if (!labelResponse.ok) {
        const errorText = await labelResponse.text();
        console.error('Bundle label purchase failed:', errorText);
        return res.status(labelResponse.status).json({
          success: false,
          message: `Failed to create bundle label: ${labelResponse.status}`,
          error: errorText
        } as BundleLabelPurchaseResponse);
      }

      const labelResult = await labelResponse.json() as any;
      console.log('Bundle label created successfully:', labelResult);

      // Extract tracking number and label data from results array
      const result = labelResult.results?.[0];
      const trackingNumber = result?.tracking_number;
      const labelUrl = result?.label;

      if (!trackingNumber) {
        return res.status(500).json({
          success: false,
          message: "Label created but no tracking number received",
          error: "Missing tracking number in API response"
        } as BundleLabelPurchaseResponse);
      }

      // Propagate tracking number to all orders in bundle
      console.log(`Updating ${orderIds.length} orders with tracking number: ${trackingNumber}`);
      
      const updateHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        updateHeaders['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const updatePromises = orderIds.map(async (orderId: string) => {
        try {
          const updateResponse = await fetch(`${ICONA_API_BASE}/orders/${orderId}`, {
            method: 'PATCH',
            headers: updateHeaders,
            body: JSON.stringify({
              tracking_number: trackingNumber,
              label_url: labelUrl, // Use correct field name
              status: 'ready_to_ship'
            })
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`Failed to update order ${orderId}:`, updateResponse.status, errorText);
            return { 
              orderId, 
              success: false, 
              error: `HTTP ${updateResponse.status}: ${errorText}` 
            };
          }

          const updatedOrder = await updateResponse.json();
          console.log(`Order ${orderId} updated with tracking number`);
          return { orderId, success: true, data: updatedOrder };
        } catch (error) {
          console.error(`Error updating order ${orderId}:`, error);
          return { 
            orderId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const updateResults = await Promise.all(updatePromises);
      const failedUpdates = updateResults.filter(result => !result.success);
      const successfulUpdates = updateResults.filter(result => result.success);

      console.log(`Bundle label results: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`);

      // Determine response status based on update results
      let responseStatus = 200;
      let message = `Bundle label created successfully for ${orderIds.length} orders`;

      if (failedUpdates.length > 0) {
        if (successfulUpdates.length === 0) {
          // Complete failure - label created but no orders updated
          responseStatus = 500;
          message = "Label created but failed to update any orders";
        } else {
          // Partial success
          responseStatus = 207; // Multi-Status
          message = `Label created with partial success: ${successfulUpdates.length}/${orderIds.length} orders updated`;
        }
      }

      // Return structured response
      const response: BundleLabelPurchaseResponse = {
        success: failedUpdates.length === 0,
        message,
        data: {
          tracking_number: trackingNumber,
          label_url: labelUrl,
          cost: estimatedCost,
          carrier: 'USPS',
          service: service,
          affected_orders: orderIds,
          update_results: updateResults,
          aggregated_weight: aggregatedWeight,
          aggregated_dimensions: aggregatedDimensions
        }
      };

      res.status(responseStatus).json(response);

    } catch (error) {
      console.error('Bundle label purchase error:', error);
      
      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid bundle label request data",
          error: error.message
        } as BundleLabelPurchaseResponse);
      }

      // Handle other errors
      const errorResponse: BundleLabelPurchaseResponse = {
        success: false,
        message: "Failed to purchase bundle label",
        error: error instanceof Error ? error.message : "Internal server error"
      };

      res.status(500).json(errorResponse);
    }
  });

  // Bulk label purchase for multiple selected orders
  app.post("/api/shipping/bulk-labels", async (req, res) => {
    try {
      const { orderIds, labelFileType, userId } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid orderIds: must be a non-empty array" 
        });
      }

      if (!labelFileType) {
        return res.status(400).json({ 
          success: false,
          message: "labelFileType is required" 
        });
      }

      console.log(`Processing bulk label purchase for ${orderIds.length} orders with format: ${labelFileType}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Fetch all orders first to build rates array
      const rates = [];
      const fetchErrors = [];

      for (const orderId of orderIds) {
        try {
          const orderResponse = await fetch(`${ICONA_API_BASE}/orders/?_id=${orderId}`, {
            method: 'GET',
            headers
          });

          if (!orderResponse.ok) {
            fetchErrors.push(`Failed to fetch order ${orderId}`);
            continue;
          }

          const orderData = await orderResponse.json() as any;
          const order = orderData.orders?.[0] || orderData.data?.orders?.[0];

          if (!order) {
            fetchErrors.push(`Order ${orderId} not found`);
            continue;
          }

          if (!order.rate_id) {
            fetchErrors.push(`Order ${orderId} has no rate_id`);
            continue;
          }

          // Build rate object for external API
          rates.push({
            rate_id: order.rate_id,
            label_file_type: labelFileType,
            order: orderId
          });
        } catch (error) {
          fetchErrors.push(
            error instanceof Error ? error.message : `Unknown error for order ${orderId}`
          );
        }
      }

      if (rates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid orders found to purchase labels",
          errors: fetchErrors
        });
      }

      // Send single request with rates array to external API
      console.log(`Sending bulk label request with ${rates.length} rates`);
      console.log('Rates being sent:', JSON.stringify(rates, null, 2));
      console.log('API URL:', `${ICONA_API_BASE}/shipping/profiles/buy/label`);
      
      const labelResponse = await fetch(`${ICONA_API_BASE}/shipping/profiles/buy/label`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rates })
      });
      
      console.log('Label API response status:', labelResponse.status);

      if (!labelResponse.ok) {
        const errorText = await labelResponse.text();
        let errorMessage = 'Failed to purchase labels';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message || errorData.error) {
            errorMessage = errorData.message || errorData.error;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        return res.status(labelResponse.status).json({
          success: false,
          message: errorMessage
        });
      }

      const labelData = await labelResponse.json();
      console.log('Label API response data:', JSON.stringify(labelData, null, 2));
      
      return res.json({
        success: true,
        message: `Successfully purchased ${rates.length} labels`,
        data: labelData,
        fetchErrors: fetchErrors.length > 0 ? fetchErrors : undefined
      });
    } catch (error) {
      console.error('Bulk label purchase error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process bulk label purchase"
      });
    }
  });
}