import { z } from 'zod';

export const createSchema = z.object({ body: z.record(z.any()) });
export const updateSchema = z.object({ body: z.record(z.any()), params: z.record(z.any()).optional() });

export const createOrderSchema = z.object({
  body: z.object({
    amount: z.number().int().min(100, 'Amount must be at least 100 paise'),
    currency: z.string().length(3).default('INR'),
    receipt: z.string().max(40).optional(),
    type: z.enum(['course', 'subscription', 'tutor_session', 'listing', 'combo']).optional(),
    referenceId: z.string().optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    type: z.enum(['course', 'subscription', 'tutor_session', 'listing', 'combo']).optional(),
    referenceId: z.string().optional(),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
});
