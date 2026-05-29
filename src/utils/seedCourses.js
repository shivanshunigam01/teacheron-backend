/** Course + curriculum seed payloads (used by seedData.js). */

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function lesson(id, title, type = 'video', durationMinutes = 12) {
  return { lessonId: id, title, type, durationMinutes, order: 1 };
}

function module(modId, title, order, lessonRows) {
  return {
    moduleId: modId,
    title,
    order,
    lessons: lessonRows.map((row, i) => {
      const [lid, lt, ty, dm] = Array.isArray(row) ? row : [row, row, 'video', 12];
      return { ...lesson(lid, lt, ty, dm), order: i + 1 };
    }),
  };
}

function curriculum(modules) {
  return modules;
}

export const CATEGORY_SEED = [
  {
    name: 'Development',
    icon: 'Code',
    sortOrder: 1,
    subcategories: ['Web', 'Mobile', 'Backend', 'DevOps'],
  },
  {
    name: 'AI & ML',
    icon: 'Brain',
    sortOrder: 2,
    subcategories: ['LLMs', 'Computer Vision', 'NLP', 'MLOps'],
  },
  {
    name: 'Data Science',
    icon: 'BarChart3',
    sortOrder: 3,
    subcategories: ['Analytics', 'Visualization', 'Statistics', 'Engineering'],
  },
  {
    name: 'Design',
    icon: 'Palette',
    sortOrder: 4,
    subcategories: ['UI/UX', 'Graphic', 'Motion', 'Branding'],
  },
  {
    name: 'Business',
    icon: 'Briefcase',
    sortOrder: 5,
    subcategories: ['Finance', 'Strategy', 'Leadership', 'Entrepreneurship'],
  },
  {
    name: 'Marketing',
    icon: 'Megaphone',
    sortOrder: 6,
    subcategories: ['SEO', 'Paid Ads', 'Content', 'Social'],
  },
  {
    name: 'Languages',
    icon: 'Languages',
    sortOrder: 7,
    subcategories: ['English', 'Spanish', 'Hindi', 'Arabic'],
  },
  {
    name: 'School',
    icon: 'GraduationCap',
    sortOrder: 8,
    subcategories: ['Class 9-10', 'Class 11-12', 'Competitive', 'Foundation'],
  },
  {
    name: 'Maths',
    icon: 'BookOpen',
    sortOrder: 9,
    subcategories: ['Algebra', 'Calculus', 'Geometry', 'Competitive'],
  },
];

/**
 * @param {Record<string, import('mongoose').Types.ObjectId>} catByName
 * @param {import('mongoose').Types.ObjectId} defaultTeacherId
 * @param {string} defaultTeacherName
 */
export function buildCourseSeed(catByName, defaultTeacherId, defaultTeacherName) {
  const g = (name) => catByName[name];

  const rows = [
    {
      title: 'AI Coding Agents Masterclass',
      category: 'AI & ML',
      instructorName: 'Rahul Mehta',
      level: 'Intermediate',
      rating: 4.8,
      reviewCount: 2415,
      price: 19,
      oldPrice: 99,
      duration: '18h',
      lessons: 86,
      students: 12450,
      bestseller: true,
      gradient: 'from-violet-500 to-indigo-600',
      description: 'Build production-grade AI agents with LLMs, RAG, and tool-calling.',
    },
    {
      title: 'PMP Certification Exam Prep 2026',
      category: 'Business',
      instructorName: 'Sarah Johnson',
      level: 'Advanced',
      rating: 4.7,
      reviewCount: 1820,
      price: 24,
      oldPrice: 129,
      duration: '32h',
      lessons: 142,
      students: 8900,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Pass the PMP on your first try with 1500+ practice questions.',
    },
    {
      title: 'Python Complete Bootcamp',
      category: 'Development',
      instructorName: 'Mark Wilson',
      level: 'Beginner',
      rating: 4.9,
      reviewCount: 5432,
      price: 15,
      oldPrice: 89,
      duration: '42h',
      lessons: 220,
      students: 32100,
      bestseller: true,
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Zero to hero — Python, automation, web scraping, and data analysis.',
    },
    {
      title: 'Data Science Masterclass',
      category: 'Data Science',
      instructorName: 'Anna Brown',
      level: 'Intermediate',
      rating: 4.8,
      reviewCount: 3210,
      price: 22,
      oldPrice: 119,
      duration: '38h',
      lessons: 156,
      students: 18700,
      bestseller: true,
      gradient: 'from-pink-500 to-rose-600',
      description: 'End-to-end data science with Python, ML, and real projects.',
    },
    {
      title: 'Digital Marketing Pro 2026',
      category: 'Marketing',
      instructorName: 'Emma Smith',
      level: 'Beginner',
      rating: 4.6,
      reviewCount: 1942,
      price: 17,
      oldPrice: 99,
      duration: '24h',
      lessons: 98,
      students: 14300,
      gradient: 'from-amber-500 to-orange-500',
      description: 'SEO, ads, social, and analytics — a full marketing stack.',
    },
    {
      title: 'Web Development Full Stack',
      category: 'Development',
      instructorName: 'Rahul Mehta',
      level: 'Intermediate',
      rating: 4.9,
      reviewCount: 4120,
      price: 21,
      oldPrice: 139,
      duration: '55h',
      lessons: 280,
      students: 25600,
      bestseller: true,
      gradient: 'from-indigo-500 to-purple-600',
      description: 'MERN stack, deploy real apps, build a portfolio.',
    },
    {
      title: 'Spoken English Mastery',
      category: 'Languages',
      instructorName: 'David Lee',
      level: 'Beginner',
      rating: 4.7,
      reviewCount: 2156,
      price: 12,
      oldPrice: 69,
      duration: '16h',
      lessons: 64,
      students: 19800,
      gradient: 'from-sky-500 to-blue-600',
      description: 'Speak confident, fluent English in 30 days.',
    },
    {
      title: 'Mathematics Foundation Class 10',
      category: 'School',
      instructorName: 'Neha Iyer',
      level: 'Beginner',
      rating: 4.8,
      reviewCount: 987,
      price: 14,
      oldPrice: 79,
      duration: '28h',
      lessons: 110,
      students: 7800,
      gradient: 'from-orange-500 to-red-500',
      description: 'Complete CBSE class 10 math with concept videos and tests.',
    },
    {
      title: 'Class 10 Mathematics (Board Prep)',
      category: 'Maths',
      instructorName: defaultTeacherName,
      level: 'Beginner',
      rating: 4.9,
      reviewCount: 70,
      price: 15,
      oldPrice: 49,
      duration: '24h',
      lessons: 60,
      students: 1200,
      gradient: 'from-orange-500 to-red-500',
      description: 'Board exam preparation with solved examples and mock tests.',
    },
    {
      title: 'Excel for Business Analytics',
      category: 'Business',
      instructorName: 'Arjun Kapoor',
      level: 'Intermediate',
      rating: 4.6,
      reviewCount: 1234,
      price: 13,
      oldPrice: 65,
      duration: '12h',
      lessons: 52,
      students: 9500,
      gradient: 'from-green-500 to-emerald-600',
      description: 'Pivot tables, dashboards, and analytics in Excel.',
    },
    {
      title: 'UI/UX Design Bootcamp',
      category: 'Design',
      instructorName: 'Lisa Chen',
      level: 'Beginner',
      rating: 4.9,
      reviewCount: 3015,
      price: 19,
      oldPrice: 109,
      duration: '28h',
      lessons: 134,
      students: 16200,
      bestseller: true,
      gradient: 'from-fuchsia-500 to-pink-600',
      description: 'Design systems, Figma, prototyping, and portfolio building.',
    },
    {
      title: 'Spanish Conversation A1-B1',
      category: 'Languages',
      instructorName: 'Maria Garcia',
      level: 'Beginner',
      rating: 4.9,
      reviewCount: 2890,
      price: 16,
      oldPrice: 89,
      duration: '22h',
      lessons: 88,
      students: 13800,
      bestseller: true,
      gradient: 'from-rose-500 to-red-600',
      description: 'Hold real Spanish conversations from your first week.',
    },
  ];

  return rows.map((row, idx) => {
    const slug = slugify(row.title);
    const catId = g(row.category);
    return {
      title: row.title,
      slug,
      instructorId: defaultTeacherId,
      instructorName: row.instructorName || defaultTeacherName,
      categoryId: catId,
      category: row.category,
      level: row.level,
      rating: row.rating,
      reviewCount: row.reviewCount,
      price: row.price,
      oldPrice: row.oldPrice,
      duration: row.duration,
      lessons: row.lessons,
      students: row.students,
      bestseller: !!row.bestseller,
      certificate: true,
      language: 'English',
      gradient: row.gradient,
      description: row.description,
      status: 'published',
      createdBy: defaultTeacherId,
      curriculum: curriculum([
        module(`${slug}-m1`, 'Getting started', 1, [
          ['l1', 'Welcome & course map', 'video', 8],
          ['l2', 'Tools & setup', 'article', 10],
          ['l3', 'How to learn effectively', 'video', 12],
        ]),
        module(`${slug}-m2`, 'Core concepts', 2, [
          ['l4', 'Foundations', 'video', 15],
          ['l5', 'Hands-on lab 1', 'video', 20],
          ['l6', 'Knowledge check', 'quiz', 10],
        ]),
        module(`${slug}-m3`, 'Projects & practice', 3, [
          ['l7', 'Guided project', 'video', 25],
          ['l8', 'Peer review tips', 'article', 8],
          ['l9', 'Final assessment', 'quiz', 15],
        ]),
      ]),
    };
  });
}
