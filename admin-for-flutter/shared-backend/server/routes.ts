import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerOrderRoutes } from "./routes/orders";
import { registerShowRoutes } from "./routes/shows";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerShippingRoutes } from "./routes/shipping";
import { registerBundleRoutes } from "./routes/bundles";
import { registerReportRoutes } from "./routes/reports";
import { registerAuthRoutes } from "./routes/auth";
import { registerProductRoutes } from "./routes/products";
import { registerCategoryRoutes } from "./routes/categories";
import { registerAddressRoutes } from "./routes/addresses";
import { registerPaymentMethodRoutes } from "./routes/payment-methods";
import { registerAdminRoutes } from "./routes/admin";
import { registerSettingsRoutes } from "./routes/settings";
import { registerGiveawayRoutes } from "./routes/giveaways";
import { registerStripeRoutes } from "./routes/stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  registerSettingsRoutes(app);
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  registerStripeRoutes(app);
  registerCategoryRoutes(app);
  registerProductRoutes(app);
  registerAddressRoutes(app);
  registerPaymentMethodRoutes(app);
  registerDashboardRoutes(app);
  registerOrderRoutes(app);
  registerShowRoutes(app);
  registerGiveawayRoutes(app);
  registerAnalyticsRoutes(app);
  registerShippingRoutes(app);
  registerBundleRoutes(app);
  registerReportRoutes(app);

  const httpServer = createServer(app);
  
  return httpServer;
}
