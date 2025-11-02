import type { Express } from "express";
import { ICONA_API_BASE } from "../utils";

export function registerSettingsRoutes(app: Express) {
  // Get public app settings (branding information)
  app.get("/api/settings", async (req, res) => {
    try {
      // For public settings, we need to fetch without requiring user authentication
      // We'll use a system-level access if available, or make it public on the API
      const url = `${ICONA_API_BASE}/admin/app/settings`;
      console.log(`Fetching public app settings from: ${url}`);
      
      // Try to get access token from session if available
      const accessToken = req.session?.accessToken;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        // Return default values if API fails
        console.warn(`Failed to fetch settings from API, using defaults`);
        return res.json({
          success: true,
          data: {
            app_name: "App",
            seo_title: "",
            support_email: "support@example.com",
            primary_color: "#F4D03F",
            secondary_color: "#1A1A1A",
            stripe_publishable_key: "",
            commission_rate: 0,
          },
        });
      }

      const data = await response.json();
      const settings = Array.isArray(data) ? data[0] : data;
      
      // Log the raw response from external API for debugging
      console.log('Raw settings from external API:', JSON.stringify(settings, null, 2));
      
      // Extract public branding information and Stripe publishable key
      const publicSettings = {
        app_name: settings?.app_name || "App",
        seo_title: settings?.seo_title || "",
        support_email: settings?.support_email || "support@example.com",
        primary_color: settings?.primary_color || "#F4D03F",
        secondary_color: settings?.secondary_color || "#1A1A1A",
        // API returns 'stripepublickey' not 'stripe_publishable_key'
        stripe_publishable_key: settings?.stripepublickey || settings?.stripe_publishable_key || "",
        commission_rate: parseFloat(settings?.commission || "0"), // API returns 'commission' as string
      };
      
      res.json({
        success: true,
        data: publicSettings,
      });
    } catch (error: any) {
      console.error("Error fetching public app settings:", error);
      // Return default values on error
      res.json({
        success: true,
        data: {
          app_name: "App",
          seo_title: "",
          support_email: "support@example.com",
          primary_color: "#F4D03F",
          secondary_color: "#1A1A1A",
          stripe_publishable_key: "",
          commission_rate: 0,
        },
      });
    }
  });
}
