import { z } from 'zod';

const bannerBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ctaText: z.string().max(80).optional(),
  ctaLink: z.string().max(500).optional(),
  imageUrl: z.string().max(2000).optional(),
  videoUrl: z.string().max(2000).optional(),
  mediaType: z.enum(['banner', 'image', 'video']).optional(),
  placement: z.enum(['popup', 'hero-strip', 'inline-banner']).optional(),
  language: z.string().max(10).optional(),
  targetType: z.enum(['global', 'country', 'city']).optional(),
  targetValue: z.string().max(120).optional(),
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(9999).optional(),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

export const createBannerSchema = z.object({ body: bannerBody });
export const updateBannerSchema = z.object({
  body: bannerBody.partial(),
  params: z.object({ id: z.string().min(1) }),
});
