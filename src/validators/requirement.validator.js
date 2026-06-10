import { z } from 'zod';

const createBody = z.object({
  title: z.string().min(5).max(200),
  subject: z.string().min(1).max(100),
  skills: z.array(z.string().min(1).max(100)).optional(),
  skill: z.string().max(100).optional(),
  level: z.enum(['elem', 'middle', 'high', 'college', 'pro', 'other']).optional(),
  levelOther: z.string().min(1).max(100).optional(),
  jobType: z.enum(['tutoring', 'assignment']).optional(),
  mode: z.enum(['online', 'offline', 'both']).optional(),
  sessionsPerWeek: z.number().min(1).max(14).optional(),
  location: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  budgetPerHour: z.number().min(0).max(100000).optional(),
  budget: z.number().min(0).max(100000).optional(),
  currency: z.string().length(3).optional(),
  duration: z.enum(['once', 'month', 'semester', 'ongoing', 'other']).optional(),
  durationOther: z.string().min(1).max(100).optional(),
  details: z.string().min(20).max(5000),
});

export const createRequirementSchema = z.object({
  body: createBody
    .refine((d) => d.level !== 'other' || Boolean(d.levelOther?.trim()), {
      message: 'levelOther is required when level is other',
    })
    .refine((d) => d.duration !== 'other' || Boolean(d.durationOther?.trim()), {
      message: 'durationOther is required when duration is other',
    }),
});

export const listJobsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    q: z.string().optional(),
    subject: z.string().optional(),
    skill: z.string().optional(),
    skills: z.string().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    mode: z.enum(['all', 'online', 'home', 'offline']).optional(),
    jobType: z.enum(['tutoring', 'assignment', 'all']).optional(),
  }),
});

export const requirementIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const adminRejectRequirementSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().min(3).max(500),
  }),
});

export const adminApproveRequirementSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminRemark: z.string().max(500).optional(),
  }),
});

export const adminListRequirementsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['pending', 'open', 'rejected', 'all']).optional(),
  }),
});
