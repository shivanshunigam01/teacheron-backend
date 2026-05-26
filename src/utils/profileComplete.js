export function computeProfileComplete(user) {
  if (!user?.name?.trim()) return false;
  if (user.role === 'student') {
    return Boolean(user.phone?.trim() || user.studentProfile?.grade?.trim());
  }
  if (user.role === 'teacher') {
    const p = user.teacherProfile || {};
    return Boolean(
      user.phone?.trim() &&
        p.teacherType &&
        p.speciality?.trim() &&
        p.gender &&
        p.birthDate &&
        (p.teachingSubjects?.length || p.subjects?.length) &&
        p.bio?.trim() &&
        p.hourlyRate != null &&
        p.location?.trim(),
    );
  }
  return true;
}

export function initialsFromName(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
