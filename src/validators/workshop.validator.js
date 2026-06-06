import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const workshopBodyBase = {
  title: z.string().min(3).max(200),
  category: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  workshopDate: z.string().min(1),
  startTime: z.string().regex(timeRegex, 'startTime must be HH:mm'),
  endTime: z.string().regex(timeRegex, 'endTime must be HH:mm'),
  mode: z.enum(['online', 'offline']),
  meetingLink: z.string().max(500).optional().or(z.literal('')),
  location: z.string().max(500).optional().or(z.literal('')),
  isFree: z.boolean().optional(),
  price: z.number().min(0).optional(),
  maxStudents: z.number().int().min(1).max(10000),
  imageUrl: z.string().max(2000).optional().or(z.literal('')),
};

export const workshopRequestSchema = z.object({
  body: z
    .object(workshopBodyBase)
    .refine(
      (d) => {
        if (d.mode === 'online') return Boolean(d.meetingLink?.trim());
        return Boolean(d.location?.trim());
      },
      { message: 'Online workshops require meetingLink; offline workshops require location' },
    )
    .refine(
      (d) => {
        const [sh, sm] = d.startTime.split(':').map(Number);
        const [eh, em] = d.endTime.split(':').map(Number);
        return eh * 60 + em > sh * 60 + sm;
      },
      { message: 'endTime must be after startTime' },
    ),
});

export const workshopListQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'inactive']).optional(),
    category: z.string().optional(),
    mode: z.enum(['online', 'offline']).optional(),
    pricing: z.enum(['free', 'paid']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const workshopRejectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().min(3).max(1000),
  }),
});

export const workshopStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['approved', 'inactive']),
  }),
});

export const workshopIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
