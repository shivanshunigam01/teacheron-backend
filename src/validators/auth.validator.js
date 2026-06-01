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

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password: z.string().min(8).max(128),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    password: z.string().min(8).max(128),
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    credential: z.string().min(10),
    role: z.enum(['student', 'teacher']).optional(),
  }),
});

const teachingSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  fromLevel: z.string().min(1).max(100),
  toLevel: z.string().min(1).max(100),
});

const teacherProfileSchema = z.object({
  teacherType: z.enum(['individual', 'company']).optional(),
  speciality: z.string().min(1).max(200).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  subjects: z.array(z.string().min(1)).min(1).optional(),
  teachingSubjects: z.array(teachingSubjectSchema).min(1).optional(),
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
    phone: z.string().min(6).max(20).optional(),
    phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    theme: z.enum(['light', 'dark']).optional(),
    locale: z.string().max(10).optional(),
    teacherProfile: teacherProfileSchema.optional(),
    studentProfile: studentProfileSchema.optional(),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
  }),
});
