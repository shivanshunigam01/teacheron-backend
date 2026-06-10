import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional()
  .or(z.literal(''));

const teachingSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  fromLevel: z.string().min(1).max(100),
  toLevel: z.string().min(1).max(100),
});

const educationEntrySchema = z.object({
  degree: z.string().min(1).max(200),
  institute: z.string().min(1).max(200),
  startDate: isoDate,
  endDate: isoDate,
  description: z.string().max(2000).optional(),
});

const experienceEntrySchema = z.object({
  title: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  startDate: isoDate,
  endDate: isoDate,
  description: z.string().max(2000).optional(),
});

export const teacherProfileBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  profilePhoto: z.string().url().optional().or(z.literal('')),
  teacherProfile: z
    .object({
      profilePhoto: z.string().url().optional().or(z.literal('')),
      teacherType: z
        .enum(['individual', 'coaching_institute', 'school', 'college', 'freelancer', 'company', 'other'])
        .optional(),
      teacherTypeOther: z.string().min(1).max(120).optional(),
      speciality: z.string().min(1).max(200).optional(),
      specialty: z.string().min(1).max(200).optional(),
      bio: z.string().min(150).max(3000).optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      genderOther: z.string().min(1).max(80).optional(),
      birthDate: isoDate,
      dateOfBirth: isoDate,
      country: z.string().min(1).max(100).optional(),
      state: z.string().max(100).optional(),
      city: z.string().min(1).max(100).optional(),
      locality: z.string().max(120).optional(),
      publicLocation: z.string().max(300).optional(),
      publicLocationDescription: z.string().max(300).optional(),
      location: z.string().max(300).optional(),
      yearsOfExperience: z.number().min(0).max(60).optional(),
      experience: z.number().min(0).max(60).optional(),
      hourlyRate: z.number().min(1).max(100000).optional(),
      currency: z.string().min(3).max(3).optional(),
      languages: z.array(z.string().min(1)).optional(),
      availability: z.string().max(500).optional(),
      onlineTeaching: z.boolean().optional(),
      homeTuition: z.boolean().optional(),
      groupClasses: z.boolean().optional(),
      assignmentHelp: z.boolean().optional(),
      teachingStyle: z.string().max(3000).optional(),
      teachingSubjects: z.array(teachingSubjectSchema).optional(),
      subjects: z.array(z.string().min(1)).optional(),
      education: z.array(educationEntrySchema).optional(),
      experiences: z.array(experienceEntrySchema).optional(),
      experienceEntries: z.array(experienceEntrySchema).optional(),
    })
    .optional(),
});

export const teacherProfileUpsertSchema = z.object({
  body: teacherProfileBodySchema
    .refine(
      (d) =>
        !d.teacherProfile ||
        d.teacherProfile.teacherType !== 'other' ||
        Boolean(d.teacherProfile.teacherTypeOther?.trim()),
      { message: 'teacherTypeOther is required when teacherType is other' },
    )
    .refine(
      (d) =>
        !d.teacherProfile ||
        d.teacherProfile.gender !== 'other' ||
        Boolean(d.teacherProfile.genderOther?.trim()),
      { message: 'genderOther is required when gender is other' },
    ),
});

export const adminTeacherStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    isActive: z.boolean().optional(),
    verified: z.boolean().optional(),
    topTen: z.boolean().optional(),
    profileCompleted: z.boolean().optional(),
  }),
});

export const adminTeachersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    q: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    profileCompleted: z.enum(['true', 'false']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const adminTeacherListQuerySchema = adminTeachersQuerySchema;

export const tutorListQuerySchema = z.object({
  query: z.object({
    subject: z.string().optional(),
    q: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    location: z.string().optional(),
    online: z.enum(['true', 'false']).optional(),
    homeTuition: z.enum(['true', 'false']).optional(),
    verified: z.enum(['true', 'false']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    language: z.string().optional(),
    maxPrice: z.string().optional(),
    minPrice: z.string().optional(),
    minExperience: z.string().optional(),
    minRating: z.string().optional(),
    sortBy: z
      .enum(['rating', 'price_asc', 'price_desc', 'reviews', 'experience'])
      .optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const tutorIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
