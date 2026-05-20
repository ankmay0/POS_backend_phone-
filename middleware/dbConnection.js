import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

/**
 * Database Connection Middleware
 * Ensures database is connected before processing requests
 * Leverages centralized connection logic from db.js
 */
export const ensureDBConnection = async (req, res, next) => {
  try {
    // ✅ Check if already connected - fast path
    if (mongoose.connection.readyState === 1) {
      return next();
    }

    // ✅ If connecting, wait briefly
    if (mongoose.connection.readyState === 2) {
      // Wait up to 5 seconds for current connection attempt
      let waitTime = 0;
      while (mongoose.connection.readyState === 2 && waitTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
      
      if (mongoose.connection.readyState === 1) {
        return next();
      }
    }

    // ✅ Attempt to establish connection using centralized logic
    console.log('🔄 Middleware: Ensuring database connection...');
    await connectDB();
    
    // ✅ Verify connection is ready
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Middleware: Database connection established');
      return next();
    }

    // ✅ Connection failed
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.error(`❌ Middleware: Database connection failed. State: ${states[mongoose.connection.readyState]}`);
    
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          state: states[mongoose.connection.readyState],
          readyState: mongoose.connection.readyState
        }
      })
    });

  } catch (error) {
    console.error('❌ Middleware: Database connection error:', error.message);
    
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message
      })
    });
  }
};

