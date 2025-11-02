import type { Express } from "express";
import { storage } from "../storage";

export function registerAnalyticsRoutes(app: Express) {
  // Analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
}