import { z } from 'zod';

export const adminCreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(['student', 'teacher', 'parent', 'admin']),
    phone: z.string().max(30).optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    teacherProfile: z
      .object({
        subjects: z.array(z.string()).optional(),
        bio: z.string().optional(),
        experience: z.number().optional(),
        hourlyRate: z.number().optional(),
        location: z.string().optional(),
        verified: z.boolean().optional(),
      })
      .optional(),
    studentProfile: z
      .object({
        grade: z.string().optional(),
        goals: z.string().optional(),
      })
      .optional(),
  }),
});

export const adminUpdateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    role: z.enum(['student', 'teacher', 'parent', 'admin']).optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
    teacherProfile: z.record(z.any()).optional(),
    studentProfile: z.record(z.any()).optional(),
  }),
});
