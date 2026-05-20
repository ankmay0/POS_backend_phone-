import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Order from '../models/orderModel.js';
import Food from '../models/foodModel.js';
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
    
    console.log('\n--- Checking Indexes ---');
    const orderIndexes = await Order.collection.getIndexes();
    console.log('Order Indexes:', Object.keys(orderIndexes));
    
    const foodIndexes = await Food.collection.getIndexes();
    console.log('Food Indexes:', Object.keys(foodIndexes));

    console.log('\n--- Measuring Performance ---');
    
    await measureTime('getOccupiedTables (Aggregation)', async () => {
      const occupiedData = await Order.aggregate([
        { $match: { status: { $ne: "Complete" }, isInRestaurant: true } },
        {
          $project: {
            tables: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$tables", []] } }, 0] },
                then: "$tables",
                else: [{ tableNumber: "$tableNumber", chairIndices: "$chairIndices" }]
              }
            }
          }
        },
        { $unwind: "$tables" },
        {
          $group: {
            _id: "$tables.tableNumber",
            allChairs: { $push: "$tables.chairIndices" }
          }
        }
      ]);
      console.log(`Found occupied tables: ${occupiedData.length}`);
    });

    await measureTime('getOrders (Indexed)', async () => {
      const orders = await Order.find().sort({ createdAt: -1 }).limit(50).lean();
      console.log(`Fetched ${orders.length} orders`);
    });

    console.log('\n✅ Verification Complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
};

verify();
