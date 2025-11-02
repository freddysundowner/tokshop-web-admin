import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy - important for sessions behind Nginx
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session configuration with header-based restoration
// Sessions are primarily restored from client headers (x-access-token, x-user-data)
// The default MemoryStore is used as temporary storage during request lifecycle
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for now until SSL is properly configured
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sessionId'
}));

// Session restoration middleware - restores sessions from headers
app.use((req, res, next) => {
  // Try to restore session from headers if session is empty
  const accessToken = req.headers['x-access-token'] as string;
  const adminToken = req.headers['x-admin-token'] as string;
  const userData = req.headers['x-user-data'] as string;
  
  // Debug logging for /api/admin/users requests
  if (req.path === '/api/admin/users') {
    console.log('[Session Restoration] /api/admin/users request:');
    console.log('  - x-admin-token:', adminToken ? 'present' : 'missing');
    console.log('  - x-access-token:', accessToken ? 'present' : 'missing');
    console.log('  - x-user-data:', userData ? 'present' : 'missing');
    console.log('  - session.user:', req.session.user ? 'exists' : 'empty');
    console.log('  - session.accessToken:', req.session.accessToken ? 'exists' : 'empty');
  }
  
  // Restore regular user session from headers
  if (accessToken && !req.session.accessToken) {
    req.session.accessToken = accessToken;
  }
  
  // Restore admin token from headers (admin routes use this)
  if (adminToken && !req.session.accessToken) {
    req.session.accessToken = adminToken;
  }
  
  // Restore user data from headers (base64 encoded)
  if (userData && !req.session.user) {
    try {
      // Decode from base64 (UTF-8)
      const decoded = Buffer.from(userData, 'base64').toString('utf8');
      const parsedUser = JSON.parse(decoded);
      req.session.user = parsedUser;
      
      if (req.path === '/api/admin/users') {
        console.log('  - Restored user:', { admin: parsedUser.admin, id: parsedUser.id });
      }
    } catch (e) {
      console.error('Failed to parse user data from header:', e);
    }
  }
  
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add API 404 handler before Vite to ensure unmatched API routes return JSON
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.path}`
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
