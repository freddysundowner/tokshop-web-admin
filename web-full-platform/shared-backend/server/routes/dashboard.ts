import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";

export function registerDashboardRoutes(app: Express) {
  // Dashboard metrics proxy
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      console.log('Proxying dashboard metrics request to Icona API');
      const response = await fetch(`${ICONA_API_BASE}/orders/dashboard/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Icona API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Dashboard metrics proxy error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics from Icona API" });
    }
  });
}