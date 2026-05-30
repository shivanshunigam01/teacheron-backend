/** Build MongoDB filter/sort for GET /users/tutors */

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTutorFilter(query = {}) {
  const filter = { role: 'teacher', isActive: { $ne: false } };

  if (query.verified === 'true') filter['teacherProfile.verified'] = true;
  if (query.online === 'true') filter['teacherProfile.online'] = true;
  if (query.online === 'false') filter['teacherProfile.online'] = false;

  if (query.gender) filter['teacherProfile.gender'] = query.gender;

  if (query.language) {
    filter['teacherProfile.languages'] = {
      $elemMatch: { $regex: new RegExp(`^${escapeRegex(query.language)}$`, 'i') },
    };
  }

  if (query.maxPrice != null && query.maxPrice !== '') {
    const n = Number(query.maxPrice);
    if (!Number.isNaN(n)) filter['teacherProfile.hourlyRate'] = { $lte: n };
  }

  if (query.minRating != null && query.minRating !== '') {
    const n = Number(query.minRating);
    if (!Number.isNaN(n)) filter['teacherProfile.rating'] = { $gte: n };
  }

  const subject = (query.subject || '').trim();
  if (subject) {
    filter['teacherProfile.subjects'] = {
      $elemMatch: { $regex: new RegExp(escapeRegex(subject), 'i') },
    };
  }

  const location = (query.location || '').trim();
  if (location) {
    const locLower = location.toLowerCase();
    if (locLower === 'online' || locLower === 'remote') {
      filter['teacherProfile.online'] = true;
    } else {
      filter['teacherProfile.location'] = { $regex: new RegExp(escapeRegex(location), 'i') };
    }
  }

  const q = (query.q || '').trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    const textClause = {
      $or: [
        { name: re },
        { 'teacherProfile.bio': re },
        { 'teacherProfile.subjects': re },
        { 'teacherProfile.location': re },
        { 'teacherProfile.speciality': re },
      ],
    };
    if (filter.$and) filter.$and.push(textClause);
    else if (Object.keys(filter).length > 2) filter.$and = [textClause];
    else Object.assign(filter, textClause);
  }

  return filter;
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
  return {
    id: o._id?.toString?.() || o.id,
    name: o.name,
    avatarUrl: o.avatarUrl || '',
    subject: subjects[0] || p.speciality || 'General',
    subjects,
    location: p.location || '',
    rating: Number(p.rating ?? 0),
    reviews: Number(p.reviewCount ?? 0),
    reviewCount: Number(p.reviewCount ?? 0),
    experience: Number(p.experience ?? 0),
    price: Number(p.hourlyRate ?? 0),
    hourlyRate: Number(p.hourlyRate ?? 0),
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
  };
}
