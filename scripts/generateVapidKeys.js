import webpush from 'web-push';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate VAPID keys for Web Push Notifications
 * Run this script once to generate keys: node scripts/generateVapidKeys.js
 */
const generateVapidKeys = () => {
  console.log('🔑 Generating VAPID keys for Web Push Notifications...\n');

  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('✅ VAPID Keys Generated:\n');
  console.log('Public Key:', vapidKeys.publicKey);
  console.log('Private Key:', vapidKeys.privateKey);
  console.log('\n📝 Add these to your .env file:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:your-email@example.com\n`);

  // Optionally save to .env file
  const envPath = join(__dirname, '..', '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if keys already exist
  if (envContent.includes('VAPID_PUBLIC_KEY')) {
    console.log('⚠️  VAPID keys already exist in .env file');
    console.log('   Please update them manually if needed.\n');
  } else {
    // Append to .env file
    const newEnvContent = envContent + 
      `\n# VAPID Keys for Web Push Notifications\n` +
      `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n` +
      `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n` +
      `VAPID_SUBJECT=mailto:your-email@example.com\n`;
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ VAPID keys saved to .env file\n');
  }

  console.log('🎉 Setup complete! Restart your server to use push notifications.');
};

generateVapidKeys();

