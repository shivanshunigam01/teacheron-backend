import { computeProfileComplete, initialsFromName } from './profileComplete.js';

const TEACHER_TYPES = [
  'individual',
  'coaching_institute',
  'school',
  'college',
  'freelancer',
  'company',
];

export { TEACHER_TYPES };

/** Build legacy location string from structured fields. */
export function buildTeacherLocationString(profile = {}) {
  const parts = [profile.locality, profile.city, profile.state, profile.country]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (parts.length) return parts.join(', ');
  return String(profile.publicLocation || profile.location || '').trim();
}

/** Derive years of experience from numeric field or work history. */
export function deriveYearsOfExperience(profile = {}) {
  if (profile.yearsOfExperience != null && !Number.isNaN(Number(profile.yearsOfExperience))) {
    return Number(profile.yearsOfExperience);
  }
  if (profile.experience != null && !Number.isNaN(Number(profile.experience))) {
    return Number(profile.experience);
  }
  const entries = profile.experiences || [];
  if (!entries.length) return 0;
  const now = Date.now();
  let totalMs = 0;
  for (const entry of entries) {
    const start = entry.startDate ? new Date(entry.startDate).getTime() : NaN;
    const end = entry.endDate ? new Date(entry.endDate).getTime() : now;
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      totalMs += end - start;
    }
  }
  return Math.max(0, Math.round(totalMs / (365.25 * 24 * 60 * 60 * 1000)));
}

export function normalizeTeacherProfilePayload(raw = {}) {
  const p = { ...raw };

  if (p.specialty && !p.speciality) p.speciality = p.specialty;
  if (p.dateOfBirth && !p.birthDate) p.birthDate = p.dateOfBirth;
  if (p.publicLocationDescription && !p.publicLocation) {
    p.publicLocation = p.publicLocationDescription;
  }
  if (p.subjects?.length && !p.teachingSubjects?.length) {
    p.teachingSubjects = p.subjects.map((name) => ({
      name: String(name),
      fromLevel: '',
      toLevel: '',
    }));
  }

  if (p.country || p.city || p.state || p.locality) {
    p.location = buildTeacherLocationString(p);
  }

  if (p.experienceEntries?.length && !p.experiences?.length) {
    p.experiences = p.experienceEntries;
  }
  if (p.onlineTeaching != null) p.online = Boolean(p.onlineTeaching);
  if (p.yearsOfExperience == null && p.experience != null && typeof p.experience === 'number') {
    p.yearsOfExperience = p.experience;
  }

  return p;
}

export function mergeTeacherProfile(user, payload = {}) {
  const normalized = normalizeTeacherProfilePayload(payload);
  const existing = user.teacherProfile?.toObject?.() || user.teacherProfile || {};
  const merged = {
    ...existing,
    ...normalized,
    initials: existing.initials || initialsFromName(user.name),
  };

  if (normalized.teachingSubjects?.length) {
    merged.subjects = normalized.teachingSubjects.map((entry) => entry.name);
  }

  merged.yearsOfExperience = deriveYearsOfExperience(merged);
  merged.experience = merged.yearsOfExperience;

  return merged;
}

export function applyTeacherProfileToUser(user, payload = {}, { avatarUrl } = {}) {
  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl || undefined;
  }
  if (payload.profilePhoto) {
    user.avatarUrl = payload.profilePhoto;
  }
  if (user.avatarUrl && !payload.profilePhoto) {
    payload = { ...payload, profilePhoto: user.avatarUrl };
  }

  user.teacherProfile = mergeTeacherProfile(user, payload);
  user.profileComplete = computeProfileComplete(user);
  user.teacherProfile.profileCompleted = user.profileComplete;
  return user;
}

export function shapeTeacherProfileDto(user) {
  const o = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const p = o.teacherProfile || {};
  const teachingSubjects = (p.teachingSubjects || []).map((entry) => ({
    name: entry.name || '',
    fromLevel: entry.fromLevel || '',
    toLevel: entry.toLevel || '',
  }));

  return {
    id: o._id?.toString?.() || o.id,
    name: o.name,
    email: o.email,
    avatarUrl: o.avatarUrl || p.profilePhoto || '',
    profilePhoto: p.profilePhoto || o.avatarUrl || '',
    phone: o.phone || '',
    phoneCountryCode: o.phoneCountryCode || '+91',
    profileComplete: !!o.profileComplete,
    profileCompleted: !!p.profileCompleted || !!o.profileComplete,
    isVerified: !!o.isVerified,
    isActive: o.isActive !== false,
    teacherProfile: {
      teacherType: p.teacherType || 'individual',
      speciality: p.speciality || '',
      specialty: p.speciality || '',
      bio: p.bio || '',
      gender: p.gender || '',
      birthDate: p.birthDate || null,
      dateOfBirth: p.birthDate || null,
      country: p.country || '',
      state: p.state || '',
      city: p.city || '',
      locality: p.locality || '',
      publicLocation: p.publicLocation || '',
      publicLocationDescription: p.publicLocation || '',
      location: buildTeacherLocationString(p),
      yearsOfExperience: deriveYearsOfExperience(p),
      experience: deriveYearsOfExperience(p),
      hourlyRate: p.hourlyRate ?? null,
      currency: p.currency || 'USD',
      languages: p.languages || [],
      availability: p.availability || '',
      onlineTeaching: p.onlineTeaching ?? p.online !== false,
      homeTuition: !!p.homeTuition,
      groupClasses: !!p.groupClasses,
      assignmentHelp: !!p.assignmentHelp,
      online: p.online !== false,
      teachingStyle: p.teachingStyle || '',
      teachingSubjects,
      subjects: p.subjects || teachingSubjects.map((s) => s.name),
      education: p.education || [],
      experiences: p.experiences || [],
      profileCompleted: !!p.profileCompleted || !!o.profileComplete,
      verified: !!p.verified,
      rating: Number(p.rating ?? 0),
      reviewCount: Number(p.reviewCount ?? 0),
    },
  };
}
