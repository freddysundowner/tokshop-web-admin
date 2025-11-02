import type { Express } from "express";
import { storage } from "../storage";
import { insertLiveShowSchema } from "../../shared/schema";
import { ICONA_API_BASE } from "../utils";
import { AccessToken } from "livekit-server-sdk";

export function registerShowRoutes(app: Express) {
  // Get public user profile by ID - proxy to external API
  app.get("/api/profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Fetching public user profile:', id);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(`${ICONA_API_BASE}/users/${id}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: 'User not found' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching user from Icona API:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get single room by ID - proxy to external API
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Fetching single room:', id);
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (req.query.currentUserId) {
        queryParams.set('currentUserId', req.query.currentUserId as string);
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const url = `${ICONA_API_BASE}/rooms/${id}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: 'Room not found' });
      }

      const data = await response.json();
      
      // Log what external API returns for activeauction
      const activeAuction = data.activeauction || data.activeAuction || data.active_auction;
      if (activeAuction) {
        console.log('🔍 EXTERNAL API activeauction bids:', activeAuction.bids);
        console.log('🔍 EXTERNAL API activeauction ended:', activeAuction.ended);
        console.log('🔍 EXTERNAL API activeauction winner:', activeAuction.winner);
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching room from Icona API:", error);
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });

  // Update room by ID - proxy to external API
  app.put("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating room:', id, 'with data:', req.body);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Note: External API uses /rooms without /api prefix
      const url = `${ICONA_API_BASE}/rooms/${id}`;
      console.log('Calling external API:', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return res.status(response.status).json({ error: 'Failed to update room' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error updating room from Icona API:", error);
      res.status(500).json({ error: "Failed to update room" });
    }
  });

  // Delete room by ID - proxy to external API
  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting room:', id);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      // Build query params
      const queryParams = new URLSearchParams();
      if (req.query.destroy) {
        queryParams.set('destroy', req.query.destroy as string);
      }
      
      const queryString = queryParams.toString();
      const url = `${ICONA_API_BASE}/rooms/${id}${queryString ? `?${queryString}` : ''}`;
      console.log('Calling external API:', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return res.status(response.status).json({ error: 'Failed to delete room' });
      }

      const data = await response.json();
      console.log('Room deleted successfully:', data);
      res.json(data);
    } catch (error) {
      console.error("Error deleting room from Icona API:", error);
      res.status(500).json({ error: "Failed to delete room" });
    }
  });

  // Create room (schedule show) - proxy to external API
  app.post("/api/rooms", async (req, res) => {
    try {
      console.log("Creating room/show via Icona API");
      console.log("Request body:", req.body);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const url = `${ICONA_API_BASE}/rooms`;
      console.log('Calling external API:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return res.status(response.status).json({ error: 'Failed to create room' });
      }

      const data = await response.json();
      console.log('Room created successfully:', data);
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating room via Icona API:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  // Rooms endpoint for homepage shows - proxy to external API
  app.get("/api/rooms", async (req, res) => {
    try {
      console.log("Proxying rooms request to Icona API");
      
      // Build query params manually to preserve empty parameters
      const params: string[] = [];
      if (req.query.page !== undefined) params.push(`page=${req.query.page}`);
      if (req.query.limit !== undefined) params.push(`limit=${req.query.limit}`);
      if (req.query.category !== undefined) params.push(`category=${req.query.category}`);
      if (req.query.userid !== undefined) params.push(`userid=${req.query.userid}`);
      if (req.query.currentUserId !== undefined) params.push(`currentUserId=${req.query.currentUserId}`);
      if (req.query.title !== undefined) params.push(`title=${req.query.title}`);
      if (req.query.status !== undefined) params.push(`status=${req.query.status}`);

      const queryString = params.join('&');
      const url = `${ICONA_API_BASE}/rooms?${queryString}`;
      console.log('Calling external API:', url);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include auth token if available
      if (req.session?.accessToken) {
        headers['Authorization'] = `Bearer ${req.session.accessToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error(`Icona API returned ${response.status}: ${response.statusText}`);
        throw new Error(`Icona API returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching rooms from Icona API:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  // Live Shows
  app.get("/api/shows", async (_req, res) => {
    try {
      const shows = await storage.getLiveShows();
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live shows" });
    }
  });

  app.post("/api/shows", async (req, res) => {
    try {
      const showData = insertLiveShowSchema.parse(req.body);
      const show = await storage.createLiveShow(showData);
      res.status(201).json(show);
    } catch (error) {
      res.status(400).json({ error: "Invalid show data" });
    }
  });

  app.patch("/api/shows/:id", async (req, res) => {
    try {
      const show = await storage.updateLiveShow(req.params.id, req.body);
      if (!show) {
        return res.status(404).json({ error: "Show not found" });
      }
      res.json(show);
    } catch (error) {
      res.status(500).json({ error: "Failed to update show" });
    }
  });

  // Get LiveKit token for room - proxy to external Icona API
  app.post("/livekit/token", async (req, res) => {
    try {
      const { room: roomId, userId: clientUserId, userName } = req.body;

      console.log('🔑 Request body received:', req.body);

      // Require authentication
      if (!req.session?.user) {
        console.error('❌ Unauthorized: No session user');
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.session?.accessToken) {
        console.error('❌ No access token in session');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const sessionUser = req.session.user;
      const userId = sessionUser._id || sessionUser.id;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`,
      };

      // Fetch room details to determine if user is owner
      const roomResponse = await fetch(`${ICONA_API_BASE}/rooms/${roomId}`, {
        method: 'GET',
        headers
      });

      if (!roomResponse.ok) {
        console.error('❌ Failed to fetch room details');
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = await roomResponse.json();
      
      // Determine role based on ownership
      const rawOwnerId = room.owner?._id || room.owner?.id;
      const showOwnerId = String(rawOwnerId);
      const normalizedUserId = String(userId);
      const isHost = normalizedUserId === showOwnerId;
      const role = isHost ? 'host' : 'audience';

      console.log('🔐 Role determination:', { 
        userId: normalizedUserId,
        showOwnerId,
        isHost,
        role
      });

      const requestBody = {
        room: roomId,
        userId: clientUserId || userId,
        userName: userName,
        role: role
      };

      console.log('📤 Sending to external API:', requestBody);

      // Proxy request to external Icona API
      const response = await fetch(`${ICONA_API_BASE}/livekit/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Icona API returned ${response.status}:`, errorText);
        return res.status(response.status).json({ 
          error: errorText || 'Failed to get LiveKit token from external API' 
        });
      }

      const data = await response.json();
      console.log('✅ LiveKit token received from Icona API');

      // Add the role we determined to the response
      res.json({
        ...data,
        role: role
      });
    } catch (error) {
      console.error('❌ Error proxying LiveKit token request:', error);
      res.status(500).json({ error: 'Failed to get LiveKit token' });
    }
  });
}