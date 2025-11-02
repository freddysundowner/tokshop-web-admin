import type { Express } from "express";
import { ICONA_API_BASE } from "../utils";

export function registerGiveawayRoutes(app: Express) {
  // Get giveaways - proxy to external API
  app.get("/api/giveaways", async (req, res) => {
    try {
      console.log('Fetching giveaways with params:', req.query);
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (req.query.name) queryParams.set('name', req.query.name as string);
      if (req.query.page) queryParams.set('page', req.query.page as string);
      if (req.query.limit) queryParams.set('limit', req.query.limit as string);
      if (req.query.room) queryParams.set('room', req.query.room as string);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const url = `${ICONA_API_BASE}/giveaways?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: 'Failed to fetch giveaways' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching giveaways from Icona API:", error);
      res.status(500).json({ error: "Failed to fetch giveaways" });
    }
  });

  // Get single giveaway by ID - proxy to external API
  app.get("/api/giveaways/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Fetching single giveaway:', id);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const url = `${ICONA_API_BASE}/giveaways/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: 'Giveaway not found' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching giveaway from Icona API:", error);
      res.status(500).json({ error: "Failed to fetch giveaway" });
    }
  });

  // Create giveaway - proxy to external API
  app.post("/api/giveaways", async (req, res) => {
    try {
      console.log('Creating giveaway with data:', req.body);
      
      if (!req.session?.accessToken) {
        return res.status(401).json({ error: 'Unauthorized - no access token' });
      }

      if (!req.session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized - no user ID' });
      }

      // Add user ID to the payload
      const giveawayData = {
        ...req.body,
        user: req.session.user.id,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`,
      };

      const url = `${ICONA_API_BASE}/giveaways`;
      console.log('Posting to Icona API:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(giveawayData),
      });
      
      const responseText = await response.text();
      console.log('Icona API response status:', response.status);
      console.log('Icona API response body:', responseText);

      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || 'Failed to create giveaway' };
        }
        return res.status(response.status).json(errorData);
      }

      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      console.error("Error creating giveaway:", error);
      res.status(500).json({ error: "Failed to create giveaway" });
    }
  });

  // Update giveaway - proxy to external API
  app.put("/api/giveaways/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating giveaway:', id, 'with data:', req.body);
      
      if (!req.session?.accessToken) {
        return res.status(401).json({ error: 'Unauthorized - no access token' });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`,
      };

      const url = `${ICONA_API_BASE}/giveaways/${id}`;
      console.log('Putting to Icona API:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(req.body),
      });
      
      const responseText = await response.text();
      console.log('Icona API response status:', response.status);
      console.log('Icona API response body:', responseText);

      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || 'Failed to update giveaway' };
        }
        return res.status(response.status).json(errorData);
      }

      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      console.error("Error updating giveaway:", error);
      res.status(500).json({ error: "Failed to update giveaway" });
    }
  });

  // Delete giveaway - proxy to external API
  app.delete("/api/giveaways/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting giveaway:', id);
      
      if (!req.session?.accessToken) {
        return res.status(401).json({ error: 'Unauthorized - no access token' });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`,
      };

      const url = `${ICONA_API_BASE}/giveaways/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to delete giveaway' };
        }
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error deleting giveaway:", error);
      res.status(500).json({ error: "Failed to delete giveaway" });
    }
  });
}
