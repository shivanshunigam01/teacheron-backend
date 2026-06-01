/** Build MongoDB filter/sort for GET /users/tutors */

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Unique location labels for tutor search dropdown (city + full address + Online). */
export function collectLocationFacets(teachers) {
  const byKey = new Map();

  const add = (label) => {
    const trimmed = String(label || '').trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, trimmed);
  };

  let hasOnline = false;
  for (const t of teachers) {
    const loc = (t.teacherProfile?.location || '').trim();
    if (loc) {
      add(loc);
      const city = loc.split(',')[0]?.trim();
      if (city) add(city);
    }
    if (t.teacherProfile?.online !== false) hasOnline = true;
  }
  if (hasOnline) add('Online');

  return [...byKey.values()].sort((a, b) => {
    if (a.toLowerCase() === 'online') return -1;
    if (b.toLowerCase() === 'online') return 1;
    return a.localeCompare(b);
  });
}

/** Countries that have at least one tutor (parsed from location strings). */
export function collectCountriesWithTutors(teachers) {
  const set = new Set();
  for (const t of teachers) {
    const loc = (t.teacherProfile?.location || '').trim();
    if (!loc || loc.toLowerCase() === 'online') continue;
    const parts = loc.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) set.add(parts[parts.length - 1]);
    else set.add(parts[0]);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

const LOCATION_ALIASES = {
  'united states': ['usa', 'u.s.a.', 'u.s.a', 'united states of america'],
  'united kingdom': ['uk', 'u.k.', 'great britain', 'england'],
  uae: ['uae', 'united arab emirates'],
};

function locationRegexPatterns(location) {
  const trimmed = String(location || '').trim();
  const key = trimmed.toLowerCase();
  const variants = new Set([trimmed]);
  for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (key === canonical || aliases.includes(key)) {
      variants.add(canonical);
      for (const a of aliases) variants.add(a);
      break;
    }
  }
  const parts = [...variants].map((v) => escapeRegex(v));
  return new RegExp(parts.join('|'), 'i');
}

export function buildTutorFilter(query = {}) {
  const and = [{ role: 'teacher' }, { isActive: { $ne: false } }];

  if (query.verified === 'true') and.push({ 'teacherProfile.verified': true });
  if (query.online === 'true') and.push({ 'teacherProfile.online': true });
  if (query.online === 'false') and.push({ 'teacherProfile.online': false });

  if (query.gender) and.push({ 'teacherProfile.gender': query.gender });

  if (query.language) {
    and.push({
      'teacherProfile.languages': {
        $elemMatch: { $regex: new RegExp(`^${escapeRegex(query.language)}$`, 'i') },
      },
    });
  }

  if (query.maxPrice != null && query.maxPrice !== '') {
    const n = Number(query.maxPrice);
    if (!Number.isNaN(n)) and.push({ 'teacherProfile.hourlyRate': { $lte: n } });
  }

  if (query.minRating != null && query.minRating !== '') {
    const n = Number(query.minRating);
    if (!Number.isNaN(n)) and.push({ 'teacherProfile.rating': { $gte: n } });
  }

  const subject = (query.subject || '').trim();
  const q = (query.q || '').trim();
  const searchTerm = subject || q;

  if (searchTerm) {
    const re = new RegExp(escapeRegex(searchTerm), 'i');
    and.push({
      $or: [
        { name: re },
        { 'teacherProfile.bio': re },
        { 'teacherProfile.speciality': re },
        { 'teacherProfile.subjects': re },
        { 'teacherProfile.subjects': { $elemMatch: { $regex: re } } },
        { 'teacherProfile.teachingSubjects.name': re },
      ],
    });
  }

  const location = (query.location || '').trim();
  if (location) {
    const locLower = location.toLowerCase();
    if (locLower === 'online' || locLower === 'remote') {
      and.push({ 'teacherProfile.online': true });
    } else {
      and.push({ 'teacherProfile.location': { $regex: locationRegexPatterns(location) } });
    }
  }

  if (and.length === 2) {
    return { role: 'teacher', isActive: { $ne: false } };
  }
  return { $and: and };
}

export function buildTutorSort(sortBy) {
  switch (sortBy) {
    case 'price_asc':
      return { 'teacherProfile.hourlyRate': 1, 'teacherProfile.rating': -1 };
    case 'price_desc':
      return { 'teacherProfile.hourlyRate': -1 };
    case 'reviews':
      return { 'teacherProfile.reviewCount': -1, 'teacherProfile.rating': -1 };
    case 'experience':
      return { 'teacherProfile.experience': -1 };
    case 'rating':
    default:
      return { 'teacherProfile.rating': -1, 'teacherProfile.reviewCount': -1 };
  }
}

export function mapTutorUser(user) {
  const o = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const p = o.teacherProfile || {};
  const subjects = p.subjects || [];
  const teachingSubjects = (p.teachingSubjects || []).map((entry) => ({
    name: entry.name || '',
    fromLevel: entry.fromLevel || '',
    toLevel: entry.toLevel || '',
  }));
  return {
    id: o._id?.toString?.() || o.id,
    name: o.name,
    avatarUrl: o.avatarUrl || '',
    subject: subjects[0] || teachingSubjects[0]?.name || p.speciality || 'General',
    subjects,
    teachingSubjects,
    speciality: p.speciality || '',
    teacherType: p.teacherType || 'individual',
    location: p.location || '',
    rating: Number(p.rating ?? 0),
    reviews: Number(p.reviewCount ?? 0),
    reviewCount: Number(p.reviewCount ?? 0),
    experience: Number(p.experience ?? 0),
    price: Number(p.hourlyRate ?? 0),
    hourlyRate: Number(p.hourlyRate ?? 0),
    currency: p.currency || 'USD',
    verified: !!p.verified,
    topTen: !!p.topTen,
    online: p.online !== false,
    language: p.languages || [],
    languages: p.languages || [],
    gender: p.gender || 'other',
    bio: p.bio || '',
    initials: p.initials || (o.name || 'T').slice(0, 2).toUpperCase(),
    gradient: p.gradient || 'linear-gradient(135deg,#38bdf8,#6366f1)',
    availability: p.availability || 'Flexible',
    lastLoginAt: o.lastLoginAt || null,
  };
}
