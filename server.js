import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import compression from "compression"; // ⚡ Response compression for faster transfers
import { connectDB } from "./config/db.js";
import foodRoutes from "./routes/foodRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import cartRoutes from "./routes/cartRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import pushRoutes from "./routes/pushRoute.js";
import offerRoutes from "./routes/offerRoute.js";
import testRoute from "./routes/testRoute.js"; // Test route for debugging
import diagnosticsRoute from "./routes/diagnosticsRoute.js"; // Diagnostic route for troubleshooting
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import cluster from "cluster";
import "./utils/errorHandlers.js"; // 🚨 Global error handlers to prevent crashes


// ✅ __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by"); // 🔒 Security best practice

// ✅ Check if running on Vercel
const isVercel = process.env.VERCEL === "1";

// ✅ HTTP + WebSocket Server (only for local development)
let server;
let io;

if (!isVercel) {
  // ✅ Local development: Create HTTP server for Socket.IO
  server = createServer(app);

  // ✅ Optimized Socket.IO Setup with Performance & Reliability Features
  io = new Server(server, {
    // CORS Configuration
    cors: {
      origin: [
        "https://foodfantasy-live.vercel.app",
        "http://localhost:5173",
        process.env.FRONTEND_URL, // Allow configured frontend URL
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    // ✅ Transport Optimization - WebSocket first, polling fallback
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    upgradeTimeout: 10000,
    allowEIO3: true,              // Backward compatibility
    
    // ✅ Connection & Performance Settings
    pingTimeout: 60000,           // 60s - longer timeout for stability
    pingInterval: 25000,          // 25s - heartbeat interval
    maxHttpBufferSize: 1e6,       // 1MB - max message size
    connectTimeout: 45000,        // 45s - connection timeout
    
    // ✅ Compression (reduces bandwidth)
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    },
    
    // ✅ Connection Limits & Security
    httpCompression: true,
    
    // ✅ Engine.IO Options
    allowRequest: (req, callback) => {
      callback(null, true);
    },
  });
  
  // ✅ Configure Socket.IO connection events with enhanced monitoring
  io.engine.on("connection_error", (err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error("❌ Socket.IO connection error:", err.req.url, err.code, err.message, err.context);
    }
  });
} else {
  // ✅ Vercel: Socket.IO won't work with WebSockets in serverless
  // Create a mock io object that routes can use without errors
  io = {
    on: () => {},
    emit: () => {},
  };
  // Socket.IO disabled on Vercel serverless
}

// ✅ MongoDB Connection (non-blocking for serverless)
// On Vercel, connections are established per request, so we don't block startup
if (!isVercel) {
  // Local development: Connect immediately with retry logic
  connectDB(0, 3) // Start with 0 retries, max 3 retries
    .then((result) => {
      if (result) {
        if (process.env.NODE_ENV !== 'production') {
          console.log("✅ MongoDB connected successfully");
        }
      } else {
        console.warn("⚠️ MongoDB connection returned null, will retry on first request");
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      console.error("💡 The server will still start, but API requests may fail");
    });
} else {
  // Vercel: Connection will be established on first request (faster cold starts)
  // MongoDB connection will be established per request on Vercel
  // Note: Pre-connection removed for faster cold starts - each request will connect as needed
}

// ✅ Security Headers Middleware (must be before CORS)
app.use((req, res, next) => {
  // ✅ Security Headers to prevent dangerous site warnings
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  // ✅ Strict Transport Security (HSTS) - force HTTPS
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  // ✅ Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://apis.google.com blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com; font-src 'self' https://fonts.gstatic.com https://*.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss: https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com https://*.gstatic.com; frame-src 'self' https://*.google.com https://*.firebaseapp.com; frame-ancestors 'none';"
  );
  
  next();
});

// ✅ Middleware
app.use(
  cors({
    origin: [
      "https://foodfantasy-live.vercel.app",
      "http://localhost:5173",
      process.env.FRONTEND_URL, // Allow configured frontend URL
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "x-admin-request",
      "Cache-Control",  // Required for polling cache-busting
      "Pragma",         // Required for polling cache-busting
      "Expires"         // Required for polling cache-busting
    ],
  })
);

// ✅ Body parser with increased limits for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ⚡ Response compression - reduces response size by 70-80%
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6,        // Balance between speed and compression ratio
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

// ✅ Store Socket.IO instance in app for route access
app.set("io", io);

// ✅ Attach Socket.IO to every request (so req.io works inside routes)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ API Routes (with error handling)
try {
  app.use("/api/foods", foodRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/push", pushRoutes);
  app.use("/api/offers", offerRoutes);
  app.use("/api/diagnostics", diagnosticsRoute);
  app.use("/api", testRoute); // Test routes for debugging
} catch (error) {
  console.error("❌ Error setting up routes:", error);
}

// ✅ Enhanced Socket.IO Event Handling with Room Management & Performance Optimization
if (!isVercel && io) {
  // Track connected clients for monitoring
  const connectedClients = new Map();
  
  io.on("connection", (socket) => {
    const clientInfo = {
      id: socket.id,
      connectedAt: Date.now(),
      rooms: new Set(),
      lastActivity: Date.now(),
      type: null, // 'admin' or 'user'
    };
    connectedClients.set(socket.id, clientInfo);

    // ✅ Heartbeat/Ping monitoring for connection health
    socket.on("ping", (callback) => {
      clientInfo.lastActivity = Date.now();
      if (typeof callback === "function") {
        callback({ timestamp: Date.now(), latency: Date.now() - clientInfo.lastActivity });
      }
    });

    // ✅ Client identification - Admin or User
    socket.on("identify", (data) => {
      const { type, userId } = data || {};
      clientInfo.type = type || "user";
      clientInfo.userId = userId;
      
      // Join appropriate rooms for efficient broadcasting
      if (type === "admin") {
        socket.join("admins");
        clientInfo.rooms.add("admins");
      } else {
        socket.join("users");
        clientInfo.rooms.add("users");
        if (userId) {
          socket.join(`user:${userId}`);
          clientInfo.rooms.add(`user:${userId}`);
        }
      }
      
      socket.emit("identified", { success: true, type: clientInfo.type });
    });

    // ✅ Optimized Realtime Events with Room-Based Broadcasting
    
    // ✅ Order Updates - Broadcast to all admins and specific user
    socket.on("orderUpdated", (updatedOrder) => {
      try {
        clientInfo.lastActivity = Date.now();
        
        if (!updatedOrder) {
          console.warn("⚠️ Received empty orderUpdated event");
          return;
        }

        // Broadcast to admins room
        io.to("admins").emit("orderStatusChanged", updatedOrder);
        
        // ✅ Broadcast to specific user by userId (if available)
        if (updatedOrder.userId) {
          io.to(`user:${updatedOrder.userId}`).emit("orderStatusChanged", updatedOrder);
        }
        
        // ✅ Also broadcast to "users" room as fallback - clients filter by userEmail
        io.to("users").emit("orderStatusChanged", updatedOrder);
      } catch (error) {
        console.error("❌ Error in orderUpdated socket handler:", error);
      }
    });

    // Food Updates - Broadcast to all clients
    socket.on("foodUpdated", (food) => {
      try {
        clientInfo.lastActivity = Date.now();
        if (food) io.emit("foodUpdated", food);
      } catch (error) {
        console.error("❌ Error in foodUpdated socket handler:", error);
      }
    });

    // Food Deleted - Broadcast to all clients
    socket.on("foodDeleted", (id) => {
      try {
        clientInfo.lastActivity = Date.now();
        if (id) io.emit("foodDeleted", id);
      } catch (error) {
        console.error("❌ Error in foodDeleted socket handler:", error);
      }
    });

    // ✅ New Order Placed - Notify admins and user
    socket.on("newOrderPlaced", (newOrder) => {
      try {
        clientInfo.lastActivity = Date.now();
        
        if (!newOrder) {
          console.warn("⚠️ Received empty newOrderPlaced event");
          return;
        }

        // Notify all admins
        io.to("admins").emit("newOrderPlaced", newOrder);
        
        // Notify the specific user who placed the order
        if (newOrder.userId) {
          io.to(`user:${newOrder.userId}`).emit("newOrderPlaced", newOrder);
        }
      } catch (error) {
        console.error("❌ Error in newOrderPlaced socket handler:", error);
      }
    });

    // ✅ Payment Success - Notify admins and user
    socket.on("paymentSuccess", (orderData) => {
      try {
        clientInfo.lastActivity = Date.now();
        
        if (!orderData) {
          console.warn("⚠️ Received empty paymentSuccess event");
          return;
        }

        // Notify all admins
        io.to("admins").emit("paymentSuccess", orderData);
        
        // Notify the specific user
        if (orderData.userId) {
          io.to(`user:${orderData.userId}`).emit("paymentSuccess", orderData);
        }
      } catch (error) {
        console.error("❌ Error in paymentSuccess socket handler:", error);
      }
    });

    // ✅ Connection Quality Monitoring
    socket.on("connectionQuality", (callback) => {
      const uptime = Date.now() - clientInfo.connectedAt;
      const idleTime = Date.now() - clientInfo.lastActivity;
      
      if (typeof callback === "function") {
        callback({
          connected: socket.connected,
          uptime,
          idleTime,
          rooms: Array.from(clientInfo.rooms),
          type: clientInfo.type,
        });
      }
    });

    // ✅ Error Handling
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });

    // ✅ Disconnection with cleanup
    socket.on("disconnect", (reason) => {
      connectedClients.delete(socket.id);
    });

    // ✅ Connection health check
    const healthCheckInterval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(healthCheckInterval);
        return;
      }
      
      // Check for stale connections (no activity for 5 minutes)
      const idleTime = Date.now() - clientInfo.lastActivity;
      if (idleTime > 300000) { // 5 minutes
        socket.disconnect(true);
        clearInterval(healthCheckInterval);
      }
    }, 60000); // Check every minute

    // Cleanup interval on disconnect
    socket.once("disconnect", () => {
      clearInterval(healthCheckInterval);
    });
  });

  // ✅ Server-level monitoring (silent - stats tracked but not logged)
  setInterval(() => {
    // Stats tracked but not logged to reduce console noise
    // const stats = {
    //   connected: connectedClients.size,
    //   admins: Array.from(connectedClients.values()).filter(c => c.type === "admin").length,
    //   users: Array.from(connectedClients.values()).filter(c => c.type === "user" || !c.type).length,
    // };
  }, 300000); // Monitor every 5 minutes
}

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("🍽️ Food Fantasy Backend is running successfully!");
});

// ✅ Global error handler for unhandled errors (must be before 404 handler)
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ✅ 404 Handler (must be last)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`,
  });
});

// ✅ Export app for Vercel serverless functions
// Vercel will use this as the handler for all routes
export default app;

// ✅ Start Server (only when running locally, not on Vercel)
// Vercel doesn't use server.listen(), it uses serverless functions
if (!isVercel && server) {
  const PORT = process.env.PORT || 8000;
  const WORKER_ID = process.env.WORKER_ID || cluster?.worker?.id || 'single';
  
  server.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Server running on port ${PORT}${WORKER_ID !== 'single' ? ` (Worker ${WORKER_ID})` : ''}`);
    }
  });
}
