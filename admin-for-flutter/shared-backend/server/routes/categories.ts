import type { Express } from "express";
import fetch from "node-fetch";
import { ICONA_API_BASE } from "../utils";

export function registerCategoryRoutes(app: Express) {
  // Categories proxy route with parameter mapping (userId → userid)
  app.get("/api/categories", async (req, res) => {
    try {
      console.log('Proxying categories request to Icona API');
      console.log('Query params received:', req.query);
      
      // Build query parameters for Icona API with proper mapping
      const queryParams = new URLSearchParams();
      
      // Map userId to userid for the external API
      if (req.query.userId) {
        queryParams.set('userid', req.query.userId as string);
      }
      
      // Pass through other parameters
      if (req.query.status && req.query.status !== 'all') {
        queryParams.set('status', req.query.status as string);
      }
      if (req.query.page) {
        queryParams.set('page', req.query.page as string);
      }
      if (req.query.limit) {
        queryParams.set('limit', req.query.limit as string);
      }
      
      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/category${queryString ? '?' + queryString : ''}`;
      
      console.log('Final API URL being called:', url);
      
      const response = await fetch(url, {
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
      console.error('Categories proxy error:', error);
      res.status(500).json({ error: "Failed to fetch categories from Icona API" });
    }
  });
}