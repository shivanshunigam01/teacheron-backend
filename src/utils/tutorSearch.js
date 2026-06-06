/** Build MongoDB filter/sort for GET /tutors and GET /users/tutors */

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLocationLabel(p = {}) {
  const parts = [p.locality, p.city, p.state, p.country].filter((s) => String(s || '').trim());
  if (parts.length) return parts.join(', ');
  return (p.publicLocation || p.location || '').trim();
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
    const loc = buildLocationLabel(t.teacherProfile || {});
    if (loc) {
      add(loc);
      const city = (t.teacherProfile?.city || loc.split(',')[0])?.trim();
      if (city) add(city);
    }
    if (t.teacherProfile?.onlineTeaching !== false || t.teacherProfile?.online !== false) {
      hasOnline = true;
    }
  }
  if (hasOnline) add('Online');

  return [...byKey.values()].sort((a, b) => {
    if (a.toLowerCase() === 'online') return -1;
    if (b.toLowerCase() === 'online') return 1;
    return a.localeCompare(b);
  });
}

/** Countries that have at least one tutor. */
export function collectCountriesWithTutors(teachers) {
  const set = new Set();
  for (const t of teachers) {
    const country = (t.teacherProfile?.country || '').trim();
    if (country) {
      set.add(country);
      continue;
    }
    const loc = (t.teacherProfile?.location || '').trim();
    if (!loc || loc.toLowerCase() === 'online') continue;
    const parts = loc.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) set.add(parts[parts.length - 1]);
    else if (parts[0]) set.add(parts[0]);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function collectCitiesWithTutors(teachers) {
  const set = new Set();
  for (const t of teachers) {
    const city = (t.teacherProfile?.city || '').trim();
    if (city) set.add(city);
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

export function buildTutorFilter(query = {}, { publicOnly = true } = {}) {
  const and = [{ role: 'teacher' }, { isActive: { $ne: false } }];

  if (publicOnly) {
    and.push({
      $or: [{ profileComplete: true }, { 'teacherProfile.profileCompleted': true }],
    });
  }

  if (query.verified === 'true') and.push({ 'teacherProfile.verified': true });

  const onlineFlag = query.online ?? query.onlineTeaching;
  if (onlineFlag === 'true') {
    and.push({
      $or: [{ 'teacherProfile.onlineTeaching': true }, { 'teacherProfile.online': true }],
    });
  }
  if (onlineFlag === 'false') {
    and.push({ 'teacherProfile.onlineTeaching': { $ne: true }, 'teacherProfile.online': { $ne: true } });
  }

  if (query.homeTuition === 'true') and.push({ 'teacherProfile.homeTuition': true });
  if (query.gender) and.push({ 'teacherProfile.gender': query.gender });

  if (query.language) {
    and.push({
      'teacherProfile.languages': {
        $elemMatch: { $regex: new RegExp(`^${escapeRegex(query.language)}$`, 'i') },
      },
    });
  }

  if (query.minPrice != null && query.minPrice !== '') {
    const n = Number(query.minPrice);
    if (!Number.isNaN(n)) and.push({ 'teacherProfile.hourlyRate': { $gte: n } });
  }

  if (query.maxPrice != null && query.maxPrice !== '') {
    const n = Number(query.maxPrice);
    if (!Number.isNaN(n)) and.push({ 'teacherProfile.hourlyRate': { $lte: n } });
  }

  if (query.minExperience != null && query.minExperience !== '') {
    const n = Number(query.minExperience);
    if (!Number.isNaN(n)) {
      and.push({
        $or: [
          { 'teacherProfile.yearsOfExperience': { $gte: n } },
          { 'teacherProfile.experience': { $gte: n } },
        ],
      });
    }
  }

  if (query.minRating != null && query.minRating !== '') {
    const n = Number(query.minRating);
    if (!Number.isNaN(n)) and.push({ 'teacherProfile.rating': { $gte: n } });
  }

  const country = (query.country || '').trim();
  if (country) {
    and.push({
      $or: [
        { 'teacherProfile.country': { $regex: locationRegexPatterns(country) } },
        { 'teacherProfile.location': { $regex: locationRegexPatterns(country) } },
      ],
    });
  }

  const city = (query.city || '').trim();
  if (city) {
    and.push({
      $or: [
        { 'teacherProfile.city': { $regex: locationRegexPatterns(city) } },
        { 'teacherProfile.location': { $regex: locationRegexPatterns(city) } },
      ],
    });
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
      and.push({
        $or: [{ 'teacherProfile.onlineTeaching': true }, { 'teacherProfile.online': true }],
      });
    } else {
      and.push({
        $or: [
          { 'teacherProfile.country': { $regex: locationRegexPatterns(location) } },
          { 'teacherProfile.state': { $regex: locationRegexPatterns(location) } },
          { 'teacherProfile.city': { $regex: locationRegexPatterns(location) } },
          { 'teacherProfile.locality': { $regex: locationRegexPatterns(location) } },
          { 'teacherProfile.publicLocation': { $regex: locationRegexPatterns(location) } },
          { 'teacherProfile.location': { $regex: locationRegexPatterns(location) } },
        ],
      });
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
      return { 'teacherProfile.yearsOfExperience': -1, 'teacherProfile.experience': -1 };
    case 'rating':
    default:
      return { 'teacherProfile.rating': -1, 'teacherProfile.reviewCount': -1 };
  }
}

function formatDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapEducation(entries = []) {
  return entries.map((entry, index) => ({
    id: entry._id?.toString?.() || entry.id || String(index),
    degree: entry.degree || '',
    institute: entry.institute || '',
    startDate: formatDate(entry.startDate),
    endDate: formatDate(entry.endDate),
    description: entry.description || '',
  }));
}

function mapExperienceEntries(entries = []) {
  return entries.map((entry, index) => ({
    id: entry._id?.toString?.() || entry.id || String(index),
    title: entry.title || '',
    organization: entry.organization || '',
    startDate: formatDate(entry.startDate),
    endDate: formatDate(entry.endDate),
    description: entry.description || '',
  }));
}

export function buildPublicLocation(p = {}) {
  if (p.publicLocation?.trim()) return p.publicLocation.trim();
  const parts = [p.locality, p.city, p.state, p.country].filter((s) => String(s || '').trim());
  if (parts.length) return parts.join(', ');
  return (p.location || '').trim();
}

export function mapTutorUser(user, { detailed = false } = {}) {
  const o = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const p = o.teacherProfile || {};
  const subjects = p.subjects || [];
  const teachingSubjects = (p.teachingSubjects || []).map((entry) => ({
    name: entry.name || '',
    fromLevel: entry.fromLevel || '',
    toLevel: entry.toLevel || '',
  }));
  const yearsExp = Number(p.yearsOfExperience ?? p.experience ?? 0);
  const location = buildPublicLocation(p);
  const onlineTeaching = p.onlineTeaching === true || (p.online !== false && p.onlineTeaching !== false);

  const base = {
    id: o._id?.toString?.() || o.id,
    name: o.name,
    avatarUrl: o.avatarUrl || p.profilePhoto || '',
    profilePhoto: p.profilePhoto || o.avatarUrl || '',
    subject: subjects[0] || teachingSubjects[0]?.name || p.speciality || 'General',
    subjects,
    teachingSubjects,
    speciality: p.speciality || '',
    teacherType: p.teacherType || 'individual',
    location,
    country: p.country || '',
    state: p.state || '',
    city: p.city || '',
    locality: p.locality || '',
    publicLocation: p.publicLocation || location,
    rating: Number(p.rating ?? 0),
    reviews: Number(p.reviewCount ?? 0),
    reviewCount: Number(p.reviewCount ?? 0),
    experience: yearsExp,
    yearsOfExperience: yearsExp,
    price: Number(p.hourlyRate ?? 0),
    hourlyRate: Number(p.hourlyRate ?? 0),
    currency: p.currency || 'USD',
    verified: !!p.verified,
    topTen: !!p.topTen,
    online: onlineTeaching,
    onlineTeaching,
    homeTuition: !!p.homeTuition,
    groupClasses: !!p.groupClasses,
    assignmentHelp: !!p.assignmentHelp,
    language: p.languages || [],
    languages: p.languages || [],
    gender: p.gender || 'other',
    bio: p.bio || '',
    teachingStyle: p.teachingStyle || '',
    availability: p.availability || 'Flexible',
    initials: p.initials || (o.name || 'T').slice(0, 2).toUpperCase(),
    gradient: p.gradient || 'linear-gradient(135deg,#38bdf8,#6366f1)',
    lastLoginAt: o.lastLoginAt || null,
    profileCompleted: !!(p.profileCompleted || o.profileComplete),
  };

  if (!detailed) return base;

  return {
    ...base,
    birthDate: formatDate(p.birthDate),
    education: mapEducation(p.education),
    experiences: mapExperienceEntries(p.experiences),
    phoneAvailable: Boolean(o.phone?.trim()),
  };
}
