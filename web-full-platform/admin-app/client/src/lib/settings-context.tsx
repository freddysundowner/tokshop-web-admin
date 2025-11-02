import { createContext, useContext, useEffect, useState } from 'react';

interface AppSettings {
  app_name: string;
  seo_title?: string;
  support_email: string;
  primary_color: string;
  secondary_color: string;
  stripe_publishable_key: string;
  commission_rate: number;
}

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  app_name: 'App',
  seo_title: '',
  support_email: 'support@example.com',
  primary_color: '#F4D03F',
  secondary_color: '#1A1A1A',
  stripe_publishable_key: '',
  commission_rate: 0, // Default 0% commission
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
});

// Helper function to convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 8-character hex (AARRGGBB or RRGGBBAA format)
  // Strip alpha channel if present
  if (hex.length === 8) {
    // Check if it's AARRGGBB (alpha first) or RRGGBBAA (alpha last)
    // Most mobile formats use AARRGGBB, so we'll handle that
    hex = hex.substring(2); // Remove first 2 chars (alpha channel)
  }
  
  // Convert hex to RGB (now guaranteed to be 6 characters)
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

// Calculate luminance to determine if color is light or dark
function getLuminance(hex: string): number {
  hex = hex.replace('#', '');
  
  // Handle 8-character hex (AARRGGBB format) - strip alpha
  if (hex.length === 8) {
    hex = hex.substring(2); // Remove first 2 chars (alpha channel)
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const rLin = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLin = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLin = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

// Apply theme colors to CSS variables
function applyThemeColors(primaryColor: string, secondaryColor: string) {
  console.log('🎨 Applying theme colors:', { primaryColor, secondaryColor });
  
  const root = document.documentElement;
  
  // Convert colors to HSL
  const primaryHSL = hexToHSL(primaryColor);
  const secondaryHSL = hexToHSL(secondaryColor);
  
  console.log('🎨 Converted to HSL:', { primaryHSL, secondaryHSL });
  
  // Determine if primary color is light or dark
  const luminance = getLuminance(primaryColor);
  const isLightColor = luminance > 0.5; // Threshold for light vs dark
  
  console.log('🎨 Luminance:', { luminance, isLightColor });
  
  // Set text color based on background luminance
  // Light backgrounds need dark text, dark backgrounds need light text
  const foregroundColor = isLightColor ? '0 0% 9%' : '0 0% 100%'; // dark or white
  
  // Apply primary color to all primary-related CSS variables
  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--primary-foreground', foregroundColor);
  root.style.setProperty('--ring', primaryHSL);
  root.style.setProperty('--chart-1', primaryHSL);
  root.style.setProperty('--sidebar-primary', primaryHSL);
  root.style.setProperty('--sidebar-primary-foreground', foregroundColor);
  root.style.setProperty('--sidebar-ring', primaryHSL);
  
  // Apply secondary color
  const secondaryLuminance = getLuminance(secondaryColor);
  const isSecondaryLight = secondaryLuminance > 0.5;
  const secondaryForeground = isSecondaryLight ? '0 0% 9%' : '0 0% 100%';
  
  root.style.setProperty('--secondary', secondaryHSL);
  root.style.setProperty('--secondary-foreground', secondaryForeground);
  root.style.setProperty('--accent', secondaryHSL);
  root.style.setProperty('--accent-foreground', secondaryForeground);
  root.style.setProperty('--chart-2', secondaryHSL);
  
  console.log('✅ Theme colors applied successfully');
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          console.log('⚙️ Settings fetched:', data);
          if (data.success && data.data) {
            console.log('⚙️ Settings data:', data.data);
            setSettings(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch app settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Apply theme colors whenever settings change
  useEffect(() => {
    if (settings.primary_color && settings.secondary_color) {
      applyThemeColors(settings.primary_color, settings.secondary_color);
    }
  }, [settings.primary_color, settings.secondary_color]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
