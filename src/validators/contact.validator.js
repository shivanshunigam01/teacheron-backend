import { z } from 'zod';

export const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(180),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(10).max(5000),
  }),
});
