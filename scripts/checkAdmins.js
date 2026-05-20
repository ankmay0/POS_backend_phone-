import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/adminModel.js';
import Subscription from '../models/subscriptionModel.js';

dotenv.config();

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admins = await Admin.find({});
    console.log(`\n👥 Total Admins: ${admins.length}`);
    admins.forEach(a => console.log(` - ${a.email} (SuperAdmin: ${a.isSuperAdmin})`));

    const subscriptions = await Subscription.find({ platform: 'web-push' });
    console.log(`\n📱 Total Web Push Subscriptions: ${subscriptions.length}`);
    subscriptions.forEach(s => console.log(` - ${s.userEmail}`));

    // Check overlap
    const adminEmails = admins.map(a => a.email);
    const subscribedAdmins = subscriptions.filter(s => adminEmails.includes(s.userEmail));
    
    console.log(`\n🔗 Admins with Active Subscriptions: ${subscribedAdmins.length}`);
    subscribedAdmins.forEach(s => console.log(` - ${s.userEmail}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmins();
