import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(['student', 'teacher']),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
});

export const resetSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(8),
  }),
});

const teacherProfileSchema = z.object({
  subjects: z.array(z.string().min(1)).min(1).optional(),
  bio: z.string().min(10).max(2000).optional(),
  experience: z.number().min(0).max(60).optional(),
  hourlyRate: z.number().min(0).max(10000).optional(),
  location: z.string().min(2).max(200).optional(),
  languages: z.array(z.string()).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  availability: z.string().max(200).optional(),
});

const studentProfileSchema = z.object({
  grade: z.string().min(1).max(50).optional(),
  goals: z.string().max(1000).optional(),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(30).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    theme: z.enum(['light', 'dark']).optional(),
    locale: z.string().max(10).optional(),
    teacherProfile: teacherProfileSchema.optional(),
    studentProfile: studentProfileSchema.optional(),
  }),
});
