import { z } from 'zod';

export const createProposalSchema = z.object({
  body: z.object({
    requirementId: z.string().min(1),
    message: z.string().min(10).max(2000).trim(),
    proposedRate: z.coerce.number().min(0).optional(),
    sessions: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const proposalIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const requirementIdParamSchema = z.object({
  params: z.object({ requirementId: z.string().min(1) }),
});

export const adminProposalListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
    q: z.string().max(120).optional(),
  }),
});

export const adminProposalReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().max(500).optional(),
  }),
});

export const adminProposalRejectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().min(3).max(500).trim(),
  }),
});
