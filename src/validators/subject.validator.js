import { z } from 'zod';

const subjectGroupEnum = z.enum([
  'academic',
  'language',
  'programming',
  'engineering',
  'business',
  'arts',
  'exam',
  'professional',
  'humanities',
  'medical',
  'law',
  'sports',
  'other',
]);

export const ensureSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).trim(),
  }),
});

export const adminSubjectListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    q: z.string().max(120).optional(),
    group: subjectGroupEnum.optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
    popular: z.enum(['true', 'false']).optional(),
  }),
});

export const adminSubjectStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).trim(),
    slug: z.string().min(2).max(120).optional(),
    group: subjectGroupEnum.optional(),
    aliases: z.array(z.string().min(1).max(80)).optional(),
    isPopular: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(99999).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(2).max(80).trim().optional(),
      slug: z.string().min(2).max(120).optional(),
      group: subjectGroupEnum.optional(),
      aliases: z.array(z.string().min(1).max(80)).optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().int().min(0).max(99999).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});
