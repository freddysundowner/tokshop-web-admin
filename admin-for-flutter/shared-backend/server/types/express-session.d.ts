import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: any; // User data from Icona API
    accessToken?: string; // JWT token from Icona API
  }
}