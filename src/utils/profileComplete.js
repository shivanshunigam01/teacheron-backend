const BIO_MIN = 150;
const BIO_MAX = 3000;

export function isBioValid(bio) {
  const len = String(bio || '').trim().length;
  return len >= BIO_MIN && len <= BIO_MAX;
}

export function computeProfileComplete(user) {
  if (!user?.name?.trim()) return false;
  if (user.role === 'student') {
    return Boolean(user.phone?.trim() || user.studentProfile?.grade?.trim());
  }
  if (user.role === 'teacher') {
    const p = user.teacherProfile || {};
    const hasPhoto = Boolean(user.avatarUrl?.trim() || p.profilePhoto?.trim());
    const hasSubjects = Boolean(p.teachingSubjects?.length || p.subjects?.length);
    const hasEducation = Boolean(p.education?.length);
    const hasExperience = Boolean(p.experiences?.length || p.experienceEntries?.length);
    const hasLocation = Boolean(
      (p.country?.trim() && p.city?.trim()) || p.location?.trim(),
    );
    const hasRate = p.hourlyRate != null && Number(p.hourlyRate) > 0;

    return Boolean(
      hasPhoto &&
        isBioValid(p.bio) &&
        hasSubjects &&
        hasExperience &&
        hasEducation &&
        hasLocation &&
        hasRate,
    );
  }
  return true;
}

export function computeTeacherProfileProgress(user) {
  if (user?.role !== 'teacher') return { percent: 100, missing: [] };
  const p = user.teacherProfile || {};
  const checks = [
    { key: 'photo', label: 'Profile photo', done: Boolean(user.avatarUrl?.trim() || p.profilePhoto?.trim()) },
    { key: 'bio', label: 'Bio (150+ characters)', done: isBioValid(p.bio) },
    { key: 'subjects', label: 'At least one subject', done: Boolean(p.teachingSubjects?.length || p.subjects?.length) },
    { key: 'experience', label: 'Work experience', done: Boolean(p.experiences?.length || p.experienceEntries?.length) },
    { key: 'education', label: 'Education', done: Boolean(p.education?.length) },
    { key: 'location', label: 'Location', done: Boolean((p.country?.trim() && p.city?.trim()) || p.location?.trim()) },
    { key: 'rate', label: 'Hourly rate', done: p.hourlyRate != null && Number(p.hourlyRate) > 0 },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  return {
    percent: Math.round((doneCount / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
    checks,
  };
}

export function initialsFromName(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export { BIO_MIN, BIO_MAX };
