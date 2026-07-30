import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const loaded = dotenv.config({ path: envPath });

if (loaded.error) {
  console.error('FAILED: Could not load', envPath, loaded.error.message);
  process.exit(1);
}

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
  console.error('FAILED: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env');
  process.exit(1);
}

console.log('Env file:', envPath);
console.log('Razorpay Key:', keyId);
console.log('Secret Loaded:', true, `(${keySecret.length} chars)`);

const client = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

try {
  const order = await client.orders.create({
    amount: 100,
    currency: 'INR',
    receipt: `test_${Date.now()}`,
  });
  console.log('OK — ₹1 test order created:', order.id);
  process.exit(0);
} catch (err) {
  const status = err?.statusCode || err?.error?.statusCode;
  const message = err?.error?.description || err?.message;
  console.error(`FAILED (${status || 'error'}):`, message);
  if (err?.error) console.error('Razorpay error payload:', JSON.stringify(err.error));
  if (status === 401) {
    console.error('');
    console.error('Root cause: Razorpay rejected this KEY_ID + KEY_SECRET pair (not a dotenv/SDK bug).');
    console.error('Fix:');
    console.error('  1. Razorpay Dashboard → Settings → API Keys → Test Mode');
    console.error('  2. Regenerate Key ID + Key Secret (use the new pair together)');
    console.error('  3. Update backend/.env RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    console.error('  4. Set NEXT_PUBLIC_RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID to the same KEY_ID');
    console.error('  5. Restart API (pm2 restart …) and rebuild frontend if public key changed');
  }
  process.exit(1);
}
