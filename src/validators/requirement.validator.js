import { z } from 'zod';
import { validateRequirementDetails } from '../utils/requirementDetails.js';

const createBody = z.object({
  title: z.string().min(5).max(200),
  subject: z.string().min(1).max(100),
  skills: z.array(z.string().min(1).max(100)).optional(),
  skill: z.string().max(100).optional(),
  subjectPendingApproval: z.boolean().optional(),
  level: z
    .enum(['elem', 'middle', 'high', 'college', 'pro', 'beginner', 'intermediate', 'advanced', 'other'])
    .optional(),
  levelOther: z.string().min(1).max(100).optional(),
  jobType: z.enum(['tutoring', 'assignment']).optional(),
  mode: z.enum(['online', 'offline', 'both']).optional(),
  meetingOptions: z
    .object({
      online: z.boolean().optional(),
      atMyPlace: z.boolean().optional(),
      travelToTutor: z.boolean().optional(),
    })
    .optional(),
  sessionsPerWeek: z.number().min(1).max(14).optional(),
  location: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  addressFormatted: z.string().min(5).max(400).optional(),
  placeId: z.string().max(200).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  budgetPerHour: z.number().min(0).max(100000).optional(),
  budget: z.number().min(0).max(100000).optional(),
  currency: z.string().length(3).optional(),
  budgetUnit: z.enum(['hour', 'day', 'week', 'month', 'year', 'fixed']).optional(),
  duration: z.enum(['once', 'month', 'semester', 'ongoing', 'other']).optional(),
  durationOther: z.string().min(1).max(100).optional(),
  timeCommitment: z.enum(['part-time', 'full-time', 'one-time', 'flexible']).optional(),
  teacherGender: z
    .enum(['any', 'prefer-female', 'prefer-male', 'only-female', 'only-male'])
    .optional(),
  languages: z.array(z.string().min(1).max(80)).max(20).optional(),
  tutorOrigin: z.string().max(120).optional(),
  phoneCountryCode: z.string().min(1).max(8),
  phone: z.string().min(6).max(20),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().max(200),
        mimeType: z.string().max(120).optional(),
        size: z.number().optional(),
      }),
    )
    .max(10)
    .optional(),
  details: z.string().min(40).max(12000),
  acceptedTerms: z.literal(true),
});

export const createRequirementSchema = z.object({
  body: createBody
    .superRefine((d, ctx) => {
      if (d.level === 'other' && !d.levelOther?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'levelOther is required when level is other',
          path: ['levelOther'],
        });
      }
      if (d.duration === 'other' && !d.durationOther?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'durationOther is required when duration is other',
          path: ['durationOther'],
        });
      }
      const detailCheck = validateRequirementDetails(d.details);
      if (!detailCheck.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: detailCheck.message,
          path: ['details'],
        });
      }
      const phoneDigits = String(d.phone || '').replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid phone number',
          path: ['phone'],
        });
      }
      const meeting = d.meetingOptions || {};
      const hasMeeting =
        meeting.online || meeting.atMyPlace || meeting.travelToTutor || Boolean(d.mode);
      if (!hasMeeting) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one meeting option',
          path: ['meetingOptions'],
        });
      }
      if ((meeting.atMyPlace || meeting.travelToTutor) && !(d.addressFormatted || d.location || d.city)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a specific location from the suggestions',
          path: ['addressFormatted'],
        });
      }
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
    level: z
      .enum(['elem', 'middle', 'high', 'college', 'pro', 'other', 'all', 'beginner', 'intermediate', 'advanced'])
      .optional(),
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
