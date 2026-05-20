import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

// New VAPID keys
const newPublicKey = 'BL5KMYDhX9HH6pG4ctVSCWu5fcAu7Rzi7VpKisEelpY-jGbhcWv-poDIglt526y1-fthLQ7sB1eCHdCpEHnm5rg';
const newPrivateKey = 'KxXlm73vQZSXhWApf7EAl0V6QAO5bR1jeCvvaWCoq7Q';

try {
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 Reading existing .env file...');
  }

  // Update or add VAPID keys
  if (envContent.includes('VAPID_PUBLIC_KEY=')) {
    // Replace existing keys
    envContent = envContent.replace(/VAPID_PUBLIC_KEY=.*/g, `VAPID_PUBLIC_KEY=${newPublicKey}`);
    envContent = envContent.replace(/VAPID_PRIVATE_KEY=.*/g, `VAPID_PRIVATE_KEY=${newPrivateKey}`);
    console.log('✅ Updated existing VAPID keys');
  } else {
    // Add new keys
    envContent += `\n# VAPID Keys for Web Push Notifications\n`;
    envContent += `VAPID_PUBLIC_KEY=${newPublicKey}\n`;
    envContent += `VAPID_PRIVATE_KEY=${newPrivateKey}\n`;
    envContent += `VAPID_SUBJECT=mailto:admin@foodfantasy.com\n`;
    console.log('✅ Added new VAPID keys');
  }

  // Ensure VAPID_SUBJECT exists
  if (!envContent.includes('VAPID_SUBJECT=')) {
    envContent += `VAPID_SUBJECT=mailto:admin@foodfantasy.com\n`;
  }

  // Write updated content
  fs.writeFileSync(envPath, envContent);
  console.log('✅ VAPID keys saved to .env file');
  console.log('\n📝 Keys configured:');
  console.log(`Public Key: ${newPublicKey}`);
  console.log(`Private Key: ${newPrivateKey}`);
  console.log('\n🎉 Setup complete! Restart your server to use the new keys.');
} catch (error) {
  console.error('❌ Error updating .env file:', error);
  process.exit(1);
}
