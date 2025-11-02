import type { Express } from "express";

const ICONA_API_BASE = 'https://api.iconaapp.com';

export function registerStripeRoutes(app: Express) {
  // Create Stripe Connect account
  app.post('/api/stripe/connect/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const accessToken = (req.session as any)?.accessToken;

      if (!accessToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      // Forward request to Icona API
      const response = await fetch(`${ICONA_API_BASE}/stripe/connect/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error: any) {
      console.error('Error creating Stripe Connect account:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to create Stripe Connect account' 
      });
    }
  });
}
