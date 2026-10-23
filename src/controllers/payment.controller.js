import Payment from '../models/Payment.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import { createPayment } from '../services/payment.service.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpay.service.js';

export const create = asyncHandler(async () => {
  throw ApiError.badRequest(
    'Direct payment creation is disabled. Use POST /payments/create-order, complete Razorpay checkout, then POST /payments/verify-payment.',
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

  if (payment?.status === 'paid') {
    return ApiResponse.ok(
      res,
      {
        verified: true,
        paymentId: payment.id,
        status: payment.status,
        invoiceId: payment.invoiceId,
        razorpay_order_id,
        razorpay_payment_id: payment.metadata?.razorpayPaymentId || razorpay_payment_id,
        connectionUnlocked: Boolean(payment.contactUnlocked),
        contactUnlocked: Boolean(payment.contactUnlocked),
        idempotent: true,
      },
      'Payment already verified',
    );
  }

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

  // Unlock gated tutor connection after successful payment
  let connectionUnlocked = false;
  if (payment.status === 'paid') {
    const meta = payment.metadata?.toObject?.() || payment.metadata || {};
    const teacherId =
      meta.teacherId ||
      meta.tutorId ||
      (type === 'tutor_session' ? referenceId || payment.referenceId : null);
    const connectionId = meta.connectionId;

    try {
      const { unlockConnectionAfterPayment } = await import('../services/connection.service.js');
      const unlocked = await unlockConnectionAfterPayment({
        learnerId: req.user.id,
        teacherId: teacherId ? String(teacherId) : undefined,
        connectionId: connectionId ? String(connectionId) : undefined,
        paymentId: payment._id,
      });
      if (unlocked) {
        connectionUnlocked = true;
        payment.contactUnlocked = true;
        await payment.save();
      }
    } catch {
      // non-fatal — payment still succeeded
    }
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
      connectionUnlocked,
      contactUnlocked: Boolean(payment.contactUnlocked),
    },
    'Payment verified',
  );
});

export const mine = asyncHandler(async (req, res) =>
  ApiResponse.ok(res, toJSONList(await Payment.find({ userId: req.user.id }).sort('-createdAt')), 'Payments fetched'),
);

/** Tutor earnings: paid tutor_session payments that reference this teacher. */
export const received = asyncHandler(async (req, res) => {
  if (req.user.role !== 'teacher') {
    throw ApiError.forbidden('Only tutors can view received payments');
  }
  const tid = String(req.user.id);
  const items = await Payment.find({
    status: 'paid',
    type: 'tutor_session',
    $or: [{ referenceId: tid }, { 'metadata.teacherId': tid }, { 'metadata.tutorId': tid }],
  }).sort('-createdAt');

  ApiResponse.ok(res, toJSONList(items), 'Received payments fetched');
});

function canAccessPayment(payment, user) {
  const uid = String(user.id);
  if (user.role === 'admin') return true;
  if (String(payment.userId) === uid) return true;
  if (user.role !== 'teacher' || payment.type !== 'tutor_session') return false;
  const meta = payment.metadata?.toObject?.() || payment.metadata || {};
  const ref = payment.referenceId?.toString?.() || String(payment.referenceId || '');
  return ref === uid || String(meta.teacherId || '') === uid || String(meta.tutorId || '') === uid;
}

export const getById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  if (!canAccessPayment(payment, req.user)) throw ApiError.forbidden();
  ApiResponse.ok(res, toJSON(payment), 'Payment fetched');
});

export const unlock = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw ApiError.forbidden('Only admins can manually unlock contact on a payment');
  }
  const p = await Payment.findByIdAndUpdate(
    req.params.id,
    { contactUnlocked: true },
    { new: true },
  );
  if (!p) throw ApiError.notFound('Payment not found');
  ApiResponse.ok(res, toJSON(p), 'Contact unlocked');
});
