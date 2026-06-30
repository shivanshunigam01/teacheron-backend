import { z } from 'zod';

export const accommodationInquirySendSchema = z.object({
  params: z.object({
    accommodationId: z.string().min(1).max(120),
  }),
  body: z.object({
    body: z.string().min(1).max(2000).trim(),
    accommodationName: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
  }),
});

export const accommodationInquiryIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const accommodationInquiryMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    body: z.string().min(1).max(2000).trim(),
  }),
});

export const adminAccommodationInquiryListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['new', 'contacted', 'closed', 'all']).optional(),
    q: z.string().max(120).optional(),
  }),
});

export const adminAccommodationInquiryStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['new', 'contacted', 'closed']),
  }),
});
