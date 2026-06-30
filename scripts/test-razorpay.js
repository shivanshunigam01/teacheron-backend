import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
  console.error('FAILED: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env');
  process.exit(1);
}

console.log('Testing Razorpay keys...');
console.log('  KEY_ID:', keyId);
console.log('  KEY_SECRET:', `${keySecret.slice(0, 4)}…${keySecret.slice(-4)} (${keySecret.length} chars)`);

const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

try {
  const order = await client.orders.create({
    amount: 10000,
    currency: 'INR',
    receipt: `test_${Date.now()}`,
  });
  console.log('OK — test order created:', order.id);
} catch (err) {
  const status = err?.statusCode || err?.error?.statusCode;
  const message = err?.error?.description || err?.message;
  console.error(`FAILED (${status || 'error'}):`, message);
  if (status === 401) {
    console.error('');
    console.error('Razorpay rejected these credentials. In Razorpay Dashboard → Settings → API Keys:');
    console.error('  1. Open Test Mode');
    console.error('  2. Regenerate Key ID + Key Secret (they must be from the same pair)');
    console.error('  3. Update backend .env AND production server .env, then restart PM2');
    console.error('  4. Set VITE_RAZORPAY_KEY_ID to the same KEY_ID and rebuild the frontend');
  }
  process.exit(1);
}
