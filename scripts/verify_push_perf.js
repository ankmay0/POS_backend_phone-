import { sendPushToAdmins } from '../utils/sendPushNotification.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const measureTime = async (label, fn) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
};

const verify = async () => {
  try {
    await connectDB();
    
    console.log('\n--- Testing Push Notification Performance ---');
    
    // Note: This will actually attempt to send notifications if subscriptions exist.
    // In a real test environment, we would mock webpush.
    // For now, we just measure the execution time of the function itself.
    
    await measureTime('sendPushToAdmins (Parallel)', async () => {
      const result = await sendPushToAdmins(
        "⚡ Performance Test",
        "Testing parallel push notifications",
        { tag: "perf-test" }
      );
      console.log('Result:', result);
    });

    console.log('\n✅ Verification Complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
};

verify();
