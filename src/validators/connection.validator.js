import { z } from 'zod';

export const createConnectionSchema = z.object({
  body: z.object({
    teacherId: z.string().min(1),
    source: z.enum(['message', 'call', 'hire']).optional(),
    initialMessage: z.string().max(2000).optional(),
  }),
});

export const connectionIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const adminConnectionListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['pending', 'approved', 'connected', 'rejected', 'all']).optional(),
    q: z.string().max(120).optional(),
  }),
});

export const adminConnectionReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().max(500).optional(),
  }),
});

export const adminConnectionRejectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().min(3).max(500).trim(),
  }),
});
