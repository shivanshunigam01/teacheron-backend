import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

let client;

function getClient() {
  const { keyId, keySecret } = env.razorpay;
  if (!keyId || !keySecret) {
    throw ApiError.internal(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env',
    );
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
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
    logger.error('[razorpay] create order failed', {
      status,
      message: err?.error?.description || err?.message,
    });
    if (status === 401) {
      throw ApiError.unauthorized('Razorpay authentication failed — check API keys');
    }
    throw ApiError.internal('Could not create Razorpay order');
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
