import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ✅ Global cache to persist connections across serverless function calls
let globalCache = global.mongooseCache || {
  primary: { conn: null, promise: null },
  secondary: { conn: null, promise: null },
  isReconnecting: false,
  lastConnectionAttempt: 0
};

global.mongooseCache = globalCache;

// ✅ Connection health monitoring
let connectionHealthCheck = null;

// ---------------------------------------------
// 🚀 SETUP CONNECTION EVENT HANDLERS
// ---------------------------------------------
const setupConnectionEventHandlers = (connection) => {
  // ✅ Handle disconnection events
  connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected! Will attempt to reconnect...');
    globalCache.primary.conn = null;
    globalCache.isReconnecting = true;
  });

  // ✅ Handle reconnection events
  connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully!');
    globalCache.isReconnecting = false;
  });

  // ✅ Handle connection errors
  connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    // Don't clear connection on minor errors, only on critical ones
    if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
      globalCache.primary.conn = null;
      globalCache.primary.promise = null;
    }
  });

  // ✅ Handle connection close
  connection.on('close', () => {
    console.warn('⚠️ MongoDB connection closed');
    globalCache.primary.conn = null;
    globalCache.primary.promise = null;
  });

  // ✅ Handle when connection is ready
  connection.on('connected', () => {
    console.log('✅ MongoDB connected and ready');
    globalCache.isReconnecting = false;
  });
};

// ---------------------------------------------
// 🚀 PRIMARY DB CONNECTION WITH IMPROVED RELIABILITY
// ---------------------------------------------
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("❌ Missing MONGODB_URI environment variable");

  // ✅ If already connected and healthy → return instantly
  if (globalCache.primary.conn && mongoose.connection.readyState === 1) {
    return globalCache.primary.conn;
  }

  // ✅ If connection is being established, wait for it
  if (globalCache.primary.promise) {
    try {
      globalCache.primary.conn = await globalCache.primary.promise;
      return globalCache.primary.conn;
    } catch (error) {
      // If promise failed, clear it and retry
      globalCache.primary.promise = null;
    }
  }

  // ✅ Prevent connection spam - wait at least 1 second between attempts
  const now = Date.now();
  const timeSinceLastAttempt = now - globalCache.lastConnectionAttempt;
  if (timeSinceLastAttempt < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastAttempt));
  }
  globalCache.lastConnectionAttempt = Date.now();

  console.log("🔗 Connecting to PRIMARY MongoDB...");

  const options = {
    // ⚡ INCREASED limits for serverless - prevents pool exhaustion
    maxPoolSize: 50,              // Increased from 10 to handle concurrent requests
    minPoolSize: 5,               // Increased from 2 for better availability
    maxIdleTimeMS: 300000,        // 5 minutes - increased from 60s to reduce reconnections
    waitQueueTimeoutMS: 15000,    // Increased from 10s for better tolerance
    
    // ⚡ Performance tuning - more aggressive timeouts
    serverSelectionTimeoutMS: 10000,  // Increased from 5s
    socketTimeoutMS: 120000,          // Increased to 2 minutes for long queries
    connectTimeoutMS: 15000,          // Increased from 10s
    heartbeatFrequencyMS: 10000,      // Check server health every 10s
    
    // ⚡ Reliability - automatic reconnection
    retryWrites: true,
    retryReads: true,
    w: 'majority',                // Write concern for data durability
    
    // ⚡ Network optimization
    family: 4,                    // IPv4 for better compatibility
    compressors: ['zlib'],        // Compress data transfer
    zlibCompressionLevel: 6,      // Balance between speed and compression
    
    // ⚡ Connection monitoring
    monitorCommands: process.env.NODE_ENV === 'development' // Monitor in dev only
  };

  globalCache.primary.promise = mongoose.connect(uri, options)
    .then((mongooseInstance) => {
      console.log("✅ PRIMARY MongoDB Connected");
      
      const connection = mongooseInstance.connection;
      
      // ✅ Setup event handlers for connection lifecycle
      setupConnectionEventHandlers(connection);
      
      // ✅ Track connection pool events (only in development to reduce logging)
      if (process.env.NODE_ENV === 'development') {
        connection.on('connectionCreated', ({ connectionId }) => {
          console.log(`🔗 New connection created: ${connectionId}`);
        });
        
        connection.on('connectionClosed', ({ connectionId }) => {
          console.log(`🔌 Connection closed: ${connectionId}`);
        });
        
        connection.on('connectionCheckedOut', ({ connectionId }) => {
          console.log(`📤 Connection checked out: ${connectionId}`);
        });
        
        connection.on('connectionCheckedIn', ({ connectionId }) => {
          console.log(`📥 Connection checked in: ${connectionId}`);
        });
      }
      
      // ✅ Health monitoring - log pool stats periodically
      if (!connectionHealthCheck) {
        connectionHealthCheck = setInterval(() => {
          const state = connection.readyState;
          const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`📊 MongoDB Health: ${stateNames[state]}`);
          }
          
          // Auto-reconnect if disconnected
          if (state === 0 && !globalCache.isReconnecting) {
            console.warn('⚠️ Health check detected disconnection, clearing cache for reconnect');
            globalCache.primary.conn = null;
            globalCache.primary.promise = null;
          }
        }, 30000); // Check every 30 seconds
      }
      
      return connection;
    })
    .catch((err) => {
      console.error("❌ PRIMARY MongoDB connection error:", err.message);
      console.error("Error stack:", err.stack);
      
      // Clear promise to allow retry
      globalCache.primary.promise = null;
      globalCache.primary.conn = null;
      
      throw err;
    });

  try {
    globalCache.primary.conn = await globalCache.primary.promise;
    return globalCache.primary.conn;
  } catch (error) {
    // Clear failed connection attempt
    globalCache.primary.promise = null;
    globalCache.primary.conn = null;
    throw error;
  }
};

// ---------------------------------------------
// 🚀 CHECK CONNECTION HEALTH
// ---------------------------------------------
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ---------------------------------------------
// 🚀 GET CONNECTION STATUS
// ---------------------------------------------
export const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    isReconnecting: globalCache.isReconnecting
  };
};

// ---------------------------------------------
// 🚀 GRACEFUL SHUTDOWN
// ---------------------------------------------
export const disconnectDB = async () => {
  if (connectionHealthCheck) {
    clearInterval(connectionHealthCheck);
    connectionHealthCheck = null;
  }
  
  if (mongoose.connection.readyState !== 0) {
    console.log('🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
    globalCache.primary.conn = null;
    globalCache.primary.promise = null;
    console.log('✅ MongoDB connection closed');
  }
};

// ---------------------------------------------
// 🚀 SECONDARY DB CONNECTION (optional)
// ---------------------------------------------
export const connectSecondaryDB = async () => {
  const secondaryUri = process.env.SECONDARY_DB_URI;

  if (!secondaryUri) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️ No SECONDARY_DB_URI provided. Skipping secondary DB.");
    }
    return null;
  }

  if (globalCache.secondary.conn) return globalCache.secondary.conn;

  if (!globalCache.secondary.promise) {
    console.log("🔗 Connecting to SECONDARY MongoDB...");

    const conn = mongoose.createConnection();

    globalCache.secondary.promise = conn
      .openUri(secondaryUri, {
        maxPoolSize: 20,              // Increased from 5
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 120000,
        connectTimeoutMS: 15000
      })
      .then(() => {
        console.log("✅ SECONDARY MongoDB Connected");
        
        // Setup event handlers for secondary connection
        setupConnectionEventHandlers(conn);
        
        return conn;
      })
      .catch((err) => {
        console.error("❌ Secondary DB Error:", err.message);
        globalCache.secondary.promise = null;
        return null; // don't crash the app
      });
  }

  globalCache.secondary.conn = await globalCache.secondary.promise;
  return globalCache.secondary.conn;
};

// ---------------------------------------------
// 🚀 CLEANUP ON PROCESS TERMINATION
// ---------------------------------------------
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

export default connectDB;
