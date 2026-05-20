import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { sendPushToUser } from '../utils/sendPushNotification.js';

dotenv.config();

const testSpecificAdminPush = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const targetEmail = "workformayank0@gmail.com";
    console.log(`🚀 Sending test push to ${targetEmail}...`);
    
    const result = await sendPushToUser(
      targetEmail,
      "🔔 Targeted Admin Test",
      "If you see this, your push subscription is working correctly!",
      { tag: 'test-target-push' }
    );

    console.log('Result:', JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testSpecificAdminPush();
