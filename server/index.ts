import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureConversationTables, storage } from "./storage";
import { ensureReviewTables } from "./create-reviews-tables";
import { startCampaignScheduler } from "./campaign-scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Initialize conversation tables at startup
  await ensureConversationTables();
  
  // Initialize review tables
  await ensureReviewTables();
  
  // Initialize coupons table
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        discount_type ENUM('fixed', 'percentage') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_value DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2) DEFAULT NULL,
        usage_limit INT DEFAULT NULL,
        used_count INT DEFAULT 0,
        valid_until DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_company_code (company_id, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Coupons table created/verified');
  } catch (error) {
    console.error('Error creating coupons table:', error);
  }
  
  // Start campaign scheduler
  startCampaignScheduler();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
