import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subscription from '../models/subscriptionModel.js';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('CONNECTED');
        
        const subs = await Subscription.find({});
        console.log(`Found ${subs.length} subscriptions.`);
        
        let updatedCount = 0;
        for (const sub of subs) {
            const original = sub.userEmail;
            const normalized = original.toLowerCase().trim();
            
            if (original !== normalized) {
                console.log(`Normalizing: "${original}" -> "${normalized}"`);
                sub.userEmail = normalized;
                await sub.save();
                updatedCount++;
            }
        }
        
        console.log(`Updated ${updatedCount} subscriptions.`);
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

migrate();
