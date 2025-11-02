import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";
import { iconaOrderSchema, Bundle } from "../../shared/schema";

export function registerBundleRoutes(app: Express) {
  // Get bundles from orders with assigned bundle IDs
  app.get("/api/bundles", async (req, res) => {
    try {
      console.log('Fetching bundles from orders with assigned bundle IDs');
      console.log('Query params received:', req.query);
      
      // Build query parameters for Icona API to get orders
      const queryParams = new URLSearchParams();
      
      // Add userId or customer parameter (required for filtering user's orders)
      if (req.query.userId) {
        queryParams.set('userId', req.query.userId as string);
      } else if (req.query.customer) {
        queryParams.set('customer', req.query.customer as string);
      } else {
        return res.status(400).json({ error: "userId or customer parameter is required" });
      }
      
      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/orders${queryString ? '?' + queryString : ''}`;
      
      console.log('Fetching orders from Icona API:', url);
      
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
      
      const data = await response.json() as any;
      const orders = data.orders || [];
      
      console.log(`Found ${orders.length} orders, filtering by bundle IDs...`);
      
      // Filter orders that have bundle IDs assigned (skip strict validation)
      const bundledOrders = orders.filter((order: any) => {
        // Only check for bundleId presence, don't validate full schema
        return order && order.bundleId && order.bundleId.trim() !== '';
      });
      
      console.log(`Found ${bundledOrders.length} orders with bundle IDs`);
      
      // Group orders by bundle ID
      const bundleGroups = new Map<string, any[]>();
      bundledOrders.forEach((order: any) => {
        const bundleId = order.bundleId;
        if (!bundleGroups.has(bundleId)) {
          bundleGroups.set(bundleId, []);
        }
        bundleGroups.get(bundleId)!.push(order);
      });
      
      // Convert groups to Bundle objects
      const bundles: Bundle[] = Array.from(bundleGroups.entries()).map(([bundleId, orders]) => {
        // Calculate aggregated values
        const totalValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const weights = orders.map(order => {
          // Try to get weight from shipping profile or items
          if (order.giveaway?.shipping_profile?.weight) {
            return order.giveaway.shipping_profile.weight;
          }
          if (order.items?.length) {
            return order.items.reduce((sum: number, item: any) => {
              const weight = parseFloat(item.weight || '0');
              return sum + (isNaN(weight) ? 0 : weight);
            }, 0);
          }
          return 0;
        }).filter(w => w > 0);
        
        const totalWeight = weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) : 0;
        
        // Get customer info from first order
        const firstOrder = orders[0];
        
        // Handle customer field - it might be a string or an object
        let customerId: string;
        let customerName: string;
        
        if (typeof firstOrder.customer === 'string') {
          // Customer is a string like "fred mundia"
          customerId = firstOrder.customer;
          customerName = firstOrder.customer;
        } else if (firstOrder.customer && typeof firstOrder.customer === 'object') {
          // Customer is an object with _id, firstName, lastName
          customerId = firstOrder.customer._id || '';
          customerName = `${firstOrder.customer.firstName || ''} ${firstOrder.customer.lastName || ''}`.trim();
        } else {
          // Fallback
          customerId = '';
          customerName = 'Unknown Customer';
        }
        
        return {
          id: bundleId,
          customerId,
          customerName,
          orderIds: orders.map(order => order._id),
          count: orders.length,
          weight: totalWeight > 0 ? `${totalWeight} oz` : undefined,
          dimensions: undefined, // Could aggregate dimensions if needed
          totalValue,
          status: "pending",
          createdAt: new Date().toISOString(),
        } as Bundle;
      });
      
      console.log(`Found ${bundles.length} bundles from ${bundledOrders.length} bundled orders`);
      
      res.json(bundles);
    } catch (error) {
      console.error('Bundles fetch error:', error);
      res.status(500).json({ error: "Failed to fetch bundles from orders" });
    }
  });

  // Delete/unbundle orders - removes bundle ID from all or selected orders in the bundle
  app.delete("/api/bundles/:bundleId", async (req, res) => {
    try {
      const { bundleId } = req.params;
      const { orderIds } = req.body || {}; // Optional: array of specific order IDs to unbundle
      console.log('Unbundling orders with bundle ID:', bundleId, orderIds ? `(selective: ${orderIds.length} orders)` : '(all orders)');

      // Get user ID from query parameter (required for security)
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId parameter is required" });
      }

      // First, get all orders for this user to find the bundled ones
      const ordersUrl = `${ICONA_API_BASE}/orders?userId=${userId}`;
      const ordersResponse = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!ordersResponse.ok) {
        throw new Error(`Failed to fetch orders: ${ordersResponse.status}`);
      }

      const ordersData = await ordersResponse.json() as any;
      const allOrders = ordersData.orders || [];

      // Find orders with the specified bundle ID
      let bundledOrders = allOrders.filter((order: any) => order.bundleId === bundleId);

      if (bundledOrders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No orders found with the specified bundle ID",
          data: { bundleId, ordersFound: 0 }
        });
      }

      // If specific orderIds provided, filter to only unbundle those
      if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
        bundledOrders = bundledOrders.filter((order: any) => orderIds.includes(order._id));
        
        if (bundledOrders.length === 0) {
          return res.status(404).json({
            success: false,
            message: "None of the specified orders were found in this bundle",
            data: { bundleId, orderIds, ordersFound: 0 }
          });
        }
      }

      console.log(`Found ${bundledOrders.length} orders to unbundle`);

      // Remove bundle ID from each order
      const unbundleResults = [];
      for (const order of bundledOrders) {
        try {
          console.log(`Removing bundle ID from order ${order._id}`);
          
          const response = await fetch(`${ICONA_API_BASE}/orders/${order._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bundleId: null })
          });

          if (response.ok) {
            const updatedOrder = await response.json();
            unbundleResults.push({
              orderId: order._id,
              success: true,
              data: updatedOrder
            });
            console.log(`Successfully removed bundle ID from order ${order._id}`);
          } else {
            const errorText = await response.text();
            console.error(`Failed to remove bundle ID from order ${order._id}:`, response.status, errorText);
            unbundleResults.push({
              orderId: order._id,
              success: false,
              error: `Failed to update: ${response.status} - ${errorText}`
            });
          }
        } catch (error) {
          console.error(`Error updating order ${order._id}:`, error);
          unbundleResults.push({
            orderId: order._id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check results
      const successfulUnbundles = unbundleResults.filter(result => result.success);
      const failedUnbundles = unbundleResults.filter(result => !result.success);

      if (successfulUnbundles.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to unbundle any orders",
          data: {
            bundleId,
            results: unbundleResults
          }
        });
      }

      // Return success with details
      res.json({
        success: true,
        message: `Bundle unbundled successfully. ${successfulUnbundles.length} orders unbundled.`,
        data: {
          bundleId,
          ordersUnbundled: successfulUnbundles.length,
          ordersFailed: failedUnbundles.length,
          results: unbundleResults
        }
      });

    } catch (error) {
      console.error('Unbundle error:', error);
      res.status(500).json({ error: "Failed to unbundle orders" });
    }
  });
}