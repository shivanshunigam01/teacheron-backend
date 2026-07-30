import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

let client;
let cachedCredentialKey = '';

function getClient() {
  const { keyId, keySecret } = env.razorpay;
  if (!keyId || !keySecret) {
    throw ApiError.internal(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env',
    );
  }
  // Razorpay Node SDK requires exactly key_id + key_secret (not keyId / api_key / secret).
  const credentialKey = `${keyId}:${keySecret}`;
  if (!client || cachedCredentialKey !== credentialKey) {
    client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    cachedCredentialKey = credentialKey;
  }
  return client;
}

/** Quick auth check — creates a tiny order and immediately validates credentials. */
export async function verifyRazorpayConnection() {
  if (!isRazorpayConfigured()) {
    logger.warn('Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env');
    return false;
  }
  logger.info(
    `Razorpay keys loaded (KEY_ID=${env.razorpay.keyId}, SECRET=${Boolean(env.razorpay.keySecret)})`,
  );
  try {
    await getClient().orders.create({
      amount: 100,
      currency: 'INR',
      receipt: `ping_${Date.now()}`,
    });
    logger.info(`Razorpay ready (key: ${env.razorpay.keyId})`);
    return true;
  } catch (err) {
    const status = err?.statusCode || err?.error?.statusCode;
    logger.error('[razorpay] credential check failed', {
      status,
      keyId: env.razorpay.keyId,
      message: err?.error?.description || err?.message,
      code: err?.error?.code,
    });
    if (status === 401) {
      logger.error(
        'Razorpay authentication failed — KEY_ID/KEY_SECRET are loaded but Razorpay rejected them. Regenerate a matching Test Mode pair in Razorpay Dashboard → Settings → API Keys, update backend .env + production .env, then restart PM2.',
      );
    }
    return false;
  }
}

export function isRazorpayConfigured() {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}

/**
 * @param {{ amount: number, currency?: string, receipt?: string, notes?: Record<string, string> }} input
 */
export async function createRazorpayOrder(input) {
  const amount = Number(input.amount);
  const currency = (input.currency || 'INR').toUpperCase();

  if (!Number.isFinite(amount) || amount < 100) {
    throw ApiError.badRequest('Amount must be at least 100 paise');
  }

  try {
    const order = await getClient().orders.create({
      amount: Math.round(amount),
      currency,
      receipt: input.receipt || `rcpt_${Date.now()}`,
      notes: input.notes || {},
    });

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (err) {
    const status = err?.statusCode || err?.error?.statusCode;
    const description = err?.error?.description || err?.message || 'Unknown Razorpay error';
    logger.error('[razorpay] create order failed', {
      status,
      message: description,
      code: err?.error?.code,
      keyIdPresent: Boolean(env.razorpay.keyId),
      secretPresent: Boolean(env.razorpay.keySecret),
      razorpay: err?.error || null,
    });
    if (status === 401) {
      throw ApiError.unauthorized(
        'Razorpay authentication failed — API keys are loaded but rejected by Razorpay. Regenerate Test Mode Key ID + Key Secret (same pair), update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, and restart the API.',
      );
    }
    throw ApiError.internal(`Could not create Razorpay order: ${description}`);
  }
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const { keySecret } = env.razorpay;
  if (!keySecret) {
    throw ApiError.internal('Razorpay is not configured');
  }
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
