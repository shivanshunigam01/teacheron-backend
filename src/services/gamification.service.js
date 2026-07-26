import User from '../models/User.model.js';

/**
 * Mark the top ~10% of active teachers (by rating, then review count) as topTen.
 * Returns how many tutors were flagged.
 */
export async function refreshTopTenBadges() {
  const tutors = await User.find({
    role: 'teacher',
    isActive: true,
    $or: [
      { 'teacherProfile.profileCompleted': true },
      { 'teacherProfile.verified': true },
      { 'teacherProfile.rating': { $gt: 0 } },
    ],
  })
    .select('_id teacherProfile.rating teacherProfile.reviewCount')
    .lean();

  if (!tutors.length) {
    await User.updateMany({ role: 'teacher' }, { $set: { 'teacherProfile.topTen': false } });
    return { total: 0, topTen: 0 };
  }

  const sorted = [...tutors].sort((a, b) => {
    const ra = Number(a.teacherProfile?.rating ?? 0);
    const rb = Number(b.teacherProfile?.rating ?? 0);
    if (rb !== ra) return rb - ra;
    return Number(b.teacherProfile?.reviewCount ?? 0) - Number(a.teacherProfile?.reviewCount ?? 0);
  });

  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const topIds = sorted.slice(0, topCount).map((t) => t._id);

  await User.updateMany({ role: 'teacher' }, { $set: { 'teacherProfile.topTen': false } });
  await User.updateMany({ _id: { $in: topIds } }, { $set: { 'teacherProfile.topTen': true } });

  return { total: tutors.length, topTen: topIds.length };
}
