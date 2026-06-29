import Payment from '../models/Payment.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import { createPayment } from '../services/payment.service.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpay.service.js';

export const create = asyncHandler(async (req, res) => {
  const p = await createPayment({ ...req.body, userId: req.user.id });
  ApiResponse.created(
    res,
    { paymentId: p.id, status: p.status, invoiceId: p.invoiceId, checkoutUrl: null },
    'Payment created',
  );
});

export const createOrder = asyncHandler(async (req, res) => {
  const { amount, currency, receipt, type, referenceId, metadata } = req.body;

  const order = await createRazorpayOrder({
    amount,
    currency,
    receipt,
    notes: {
      userId: String(req.user.id),
      ...(type ? { type } : {}),
      ...(referenceId ? { referenceId: String(referenceId) } : {}),
    },
  });

  await Payment.create({
    userId: req.user.id,
    type: type || 'tutor_session',
    referenceId: referenceId || undefined,
    amount: amount / 100,
    currency: order.currency,
    method: 'razorpay',
    status: 'pending',
    metadata: {
      ...metadata,
      razorpayOrderId: order.order_id,
    },
  });

  ApiResponse.ok(res, order, 'Order created');
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    type,
    referenceId,
    amount,
    currency,
    metadata,
  } = req.body;

  const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  let payment = await Payment.findOne({
    userId: req.user.id,
    'metadata.razorpayOrderId': razorpay_order_id,
  });

  if (!payment) {
    payment = await createPayment({
      userId: req.user.id,
      type: type || 'tutor_session',
      referenceId: referenceId || undefined,
      amount: amount || 0,
      currency: currency || 'INR',
      method: 'razorpay',
      status: 'paid',
      metadata: {
        ...metadata,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });
  } else {
    payment.status = 'paid';
    payment.metadata = {
      ...(payment.metadata?.toObject?.() || payment.metadata || {}),
      razorpayPaymentId: razorpay_payment_id,
      ...metadata,
    };
    payment.invoiceId = payment.invoiceId || `INV-${Date.now()}`;
    await payment.save();
  }

  ApiResponse.ok(
    res,
    {
      verified: true,
      paymentId: payment.id,
      status: payment.status,
      invoiceId: payment.invoiceId,
      razorpay_order_id,
      razorpay_payment_id,
    },
    'Payment verified',
  );
});

export const mine = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, toJSONList(await Payment.find({ userId: req.user.id }).sort('-createdAt')), 'Payments fetched'),
);

export const getById = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, toJSON(await Payment.findById(req.params.id)), 'Payment fetched'),
);

export const unlock = asyncHandler(async (req, res) => {
  const p = await Payment.findByIdAndUpdate(req.params.id, { contactUnlocked: true }, { new: true });
  ApiResponse.ok(res, toJSON(p), 'Contact unlocked');
});
