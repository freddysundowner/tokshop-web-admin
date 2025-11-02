import crypto from "crypto";
import type { IconaOrder, Bundle } from "../shared/schema";

// API Configuration - configurable via environment variable
// Remove trailing slash to prevent double slashes in URLs
const apiBase = process.env.ICONA_API_BASE || "https://api.iconaapp.com";
export const ICONA_API_BASE = apiBase.replace(/\/$/, "");
console.log(`[API Config] ICONA_API_BASE: ${ICONA_API_BASE}`);

// Bundle utility functions
export function generateBundleId(orderIds: string[]): string {
  const sortedIds = [...orderIds].sort();
  const hash = crypto
    .createHash("sha256")
    .update(sortedIds.join(","))
    .digest("hex");
  return `bundle_${hash.substring(0, 12)}`;
}

export function aggregateOrdersData(orders: IconaOrder[]) {
  let totalWeight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;
  let totalValue = 0;

  orders.forEach((order) => {
    // Aggregate value (total + fees + tax + shipping)
    const orderTotal =
      (order.total || 0) +
      (order.servicefee || 0) +
      (order.tax || 0) +
      (order.shipping_fee || 0);
    totalValue += orderTotal;

    // Aggregate weight from items or use shipping profile
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        if (item.weight) {
          const weight = parseFloat(item.weight.replace(/[^\d.]/g, ""));
          if (!isNaN(weight)) {
            totalWeight += weight;
          }
        }
      });
    }

    // Aggregate dimensions from items
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        if (item.length && item.width && item.height) {
          const length = parseFloat(item.length);
          const width = parseFloat(item.width);
          const height = parseFloat(item.height);

          if (!isNaN(length) && !isNaN(width) && !isNaN(height)) {
            maxLength = Math.max(maxLength, length);
            maxWidth = Math.max(maxWidth, width);
            totalHeight += height;
          }
        }
      });
    }
  });

  return {
    weight: totalWeight > 0 ? `${totalWeight} oz` : undefined,
    dimensions:
      maxLength > 0
        ? `${maxLength} x ${maxWidth} x ${totalHeight} in`
        : undefined,
    totalValue,
  };
}

export function computeBundlesFromOrders(orders: IconaOrder[]): Bundle[] {
  // Filter orders that can be bundled (processing status, no tracking number)
  const bundleableOrders = orders.filter(
    (order) => order.status === "processing" && !order.tracking_number,
  );

  // Group by customer ID
  const ordersByCustomer = new Map<string, IconaOrder[]>();

  bundleableOrders.forEach((order) => {
    const customerId =
      typeof order.customer === "object" ? order.customer._id : order.customer;
    if (!ordersByCustomer.has(customerId)) {
      ordersByCustomer.set(customerId, []);
    }
    ordersByCustomer.get(customerId)!.push(order);
  });

  // Create bundles for customers with 2+ orders
  const bundles: Bundle[] = [];

  ordersByCustomer.forEach((customerOrders, customerId) => {
    if (customerOrders.length >= 2) {
      const orderIds = customerOrders.map((order) => order._id);
      const aggregated = aggregateOrdersData(customerOrders);

      // Get customer name from first order
      const firstOrder = customerOrders[0];
      const customerName =
        typeof firstOrder.customer === "object"
          ? `${firstOrder.customer.firstName} ${firstOrder.customer.lastName || ""}`.trim()
          : "Unknown Customer";

      const bundle: Bundle = {
        id: generateBundleId(orderIds),
        customerId,
        customerName,
        orderIds,
        count: customerOrders.length,
        weight: aggregated.weight,
        dimensions: aggregated.dimensions,
        totalValue: aggregated.totalValue,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      bundles.push(bundle);
    }
  });

  return bundles.sort(
    (a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
  );
}
