import { connectDB, secondaryConnection } from '../config/db.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const verifyConnections = async () => {
  try {
    console.log('🔄 Testing Database Connections...');
    
    // Connect to databases
    const connections = await connectDB();
    
    // Check Primary Connection
    if (connections.primary && connections.primary.readyState === 1) {
      console.log('✅ Primary Database: CONNECTED');
    } else {
      console.error('❌ Primary Database: FAILED (State: ' + (connections.primary ? connections.primary.readyState : 'null') + ')');
    }

    // Check Secondary Connection
    // Note: secondaryConnection is also exported, but connectDB returns it too
    if (connections.secondary && connections.secondary.readyState === 1) {
      console.log('✅ Secondary Database: CONNECTED');
    } else {
      console.error('❌ Secondary Database: FAILED');
    }

    // Wait a moment to ensure logs are flushed
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
};

verifyConnections();
