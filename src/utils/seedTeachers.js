import { isBioValid } from './bioWords.js';

/** Shared 150+ word bios for seeded tutor profiles. */
const BIOS = {
  demo: `I am a dedicated mathematics and physics educator with eight years of full-time tutoring experience across high school and early college levels. My teaching philosophy centers on building strong conceptual foundations before advancing to exam-style problem solving. Every student begins with a diagnostic assessment so I can identify gaps in fundamentals and tailor a learning plan to their goals. Sessions blend clear explanations, interactive whiteboard work, and guided practice with immediate feedback. I have successfully coached learners for AP Physics, SAT Math, Regents exams, and university calculus with measurable score improvements. Parents receive concise weekly summaries covering topics taught, homework assigned, and recommended next steps. I maintain a calm, encouraging atmosphere where questions are always welcome and mistakes are treated as learning opportunities. Online lessons use shared notes, recordings for revision, and structured homework between sessions. For local students I also offer in-person tutoring within the New York metro area. I hold a master's degree in applied physics and previously served as a teaching assistant in a university laboratory program. My goal is lasting confidence in quantitative reasoning that supports students through college and career.`,
  priya: `I am Priya Sharma, a NEET and board-exam biology specialist based in Delhi with six years of experience mentoring pre-medical students across India. My classes combine NCERT mastery, diagram-based revision, and high-yield mnemonics that help students retain complex pathways in physiology and genetics. I begin each topic with simplified storytelling before introducing textbook definitions and previous-year questions. Weekly tests mirror actual exam difficulty so students learn time management under pressure. I provide personalized feedback on weak chapters and recommend focused drills until mastery is achieved. Many of my students have secured ranks in state-level medical entrance tests and improved their school grades within the first term of coaching. I offer live online classes, doubt-clearing sessions, and structured revision boot camps before major exams. Parents appreciate transparent communication about attendance, assignment completion, and predicted readiness. I earned my MSc in Life Sciences from a leading Indian university and have published simplified study guides for Class eleven and twelve learners. Whether you need help with botany, zoology, or chemistry crossover topics, I design a roadmap that fits your school schedule and coaching timetable. My mission is to make competitive exam preparation disciplined, motivating, and achievable for every sincere student.`,
  rahul: `I am Rahul Mehta, a senior computer science mentor from Bengaluru with ten years of industry and teaching experience. I help students and working professionals master Python, data structures, algorithms, and full-stack web development through project-driven learning. Each course module ends with a mini-project that reinforces concepts like APIs, databases, testing, and deployment. I explain abstract ideas using real startup scenarios so learners understand why patterns matter in production code. Interview preparation tracks include mock coding rounds, system design basics, and resume reviews for software roles. My students have joined product companies, cleared campus placements, and built portfolio apps that demonstrate practical skill. Live sessions use collaborative coding environments, version control workflows, and code review habits used by professional teams. I also mentor freelancers transitioning into tech careers with structured weekly milestones. I previously worked as a software engineer at a global technology company and continue contributing to open-source tools used in classrooms. Whether you are a complete beginner or refreshing advanced topics, I adapt pace and depth to your background. Assignments include automated checks and personalized feedback within forty-eight hours. My teaching style is direct, friendly, and focused on building confidence through repeated successful delivery of working software.`,
  emma: `I am Emma Smith, an English literature and communication coach based in London with five years of experience supporting GCSE, A-Level, and international students. My lessons develop critical reading, structured essay writing, and confident spoken English for academic and professional settings. We analyze texts across poetry, drama, and prose while practicing thesis statements, evidence selection, and persuasive argumentation. For spoken English clients I use role-play, pronunciation drills, and presentation rehearsals tailored to interviews or classroom discussions. Students receive annotated feedback on drafts so they understand how to improve clarity, tone, and grammar in future assignments. I have helped learners raise coursework grades, pass language proficiency requirements, and gain admission to competitive humanities programs. Sessions are available online worldwide and in person across Greater London when schedules align. I hold a BA and MA in English from respected UK institutions and have tutored in both private schools and community education centers. My approach balances rigorous standards with encouragement, ensuring students feel supported while meeting examiner expectations. Weekly planners track reading goals, vocabulary growth, and timed writing practice. Parents and adult learners appreciate flexible scheduling around exams and work commitments. Together we build skills that last beyond a single test date and empower learners to express ideas with precision and confidence.`,
  david: `I am David Lee, an IELTS and spoken English specialist teaching learners worldwide through flexible online sessions. Over four years I have coached students, professionals, and migrants to achieve target band scores and communicate clearly in international environments. My IELTS program covers listening strategies, academic writing templates, speaking fluency drills, and reading speed techniques aligned with current exam formats. Spoken English classes emphasize practical conversation, workplace email tone, and presentation confidence rather than rote memorization. Each learner receives a customized study plan based on diagnostic speaking and writing samples collected in the first session. Homework includes recorded responses so I can pinpoint pronunciation, grammar, and coherence issues between meetings. Many clients improve by one full band within eight to twelve weeks of consistent practice. I provide mock tests under timed conditions and detailed score breakdowns with actionable next steps. My background includes TESOL certification and experience teaching corporate teams across Europe and Asia. Sessions are friendly, structured, and results oriented, with progress tracked in shared documents visible to the student. Whether your goal is university admission abroad, visa requirements, or career advancement, I help you speak and write English with clarity, accuracy, and natural rhythm that examiners and colleagues respect.`,
};

function teachingSubjects(names) {
  return names.map((name) => ({
    name,
    fromLevel: 'High School',
    toLevel: 'Advanced',
  }));
}

function edu(degree, institute, start, end, description) {
  return { degree, institute, startDate: start, endDate: end, description };
}

function exp(title, organization, start, end, description) {
  return { title, organization, startDate: start, endDate: end, description };
}

/** Five complete, public-ready tutor accounts. */
export const TEACHER_ACCOUNT_SEEDS = [
  {
    name: 'Demo Tutor',
    email: 'teacher@teacherpoint.com',
    phone: '5550100001',
    phoneCountryCode: '+1',
    avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop',
    teacherProfile: {
      teacherType: 'individual',
      speciality: 'Mathematics & Physics Tutor',
      bio: BIOS.demo,
      gender: 'male',
      country: 'United States',
      state: 'New York',
      city: 'New York',
      locality: 'Manhattan',
      publicLocation: 'New York, USA',
      location: 'New York, USA',
      subjects: ['Mathematics', 'Physics'],
      teachingSubjects: teachingSubjects(['Mathematics', 'Physics']),
      education: [
        edu('MSc Applied Physics', 'Columbia University', '2014-09-01', '2016-06-01', 'Graduate teaching assistant'),
      ],
      experiences: [
        exp('Senior Math & Physics Tutor', 'Independent Practice', '2017-01-01', '', 'AP and SAT coaching'),
      ],
      yearsOfExperience: 8,
      experience: 8,
      hourlyRate: 35,
      currency: 'USD',
      languages: ['English'],
      availability: 'Weekdays · Evenings',
      teachingStyle: 'Concept-first teaching with weekly progress reports for parents.',
      onlineTeaching: true,
      homeTuition: true,
      groupClasses: false,
      assignmentHelp: true,
      verified: true,
      topTen: true,
      online: true,
      initials: 'DT',
      gradient: 'from-blue-500 to-purple-500',
      rating: 4.9,
      reviewCount: 48,
      profileCompleted: true,
    },
  },
  {
    name: 'Priya Sharma',
    email: 'priya.tutor@teacherpoint.com',
    phone: '9876543210',
    phoneCountryCode: '+91',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    teacherProfile: {
      teacherType: 'individual',
      speciality: 'NEET Biology Specialist',
      bio: BIOS.priya,
      gender: 'female',
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      locality: 'South Delhi',
      publicLocation: 'New Delhi, India',
      location: 'Delhi, India',
      subjects: ['Biology', 'Chemistry'],
      teachingSubjects: teachingSubjects(['Biology', 'Chemistry']),
      education: [edu('MSc Life Sciences', 'University of Delhi', '2015-07-01', '2017-06-01', 'NEET curriculum focus')],
      experiences: [
        exp('NEET Biology Coach', 'Delhi Coaching Centre', '2018-06-01', '', 'Pre-medical batch mentoring'),
      ],
      yearsOfExperience: 6,
      experience: 6,
      hourlyRate: 22,
      currency: 'INR',
      languages: ['English', 'Hindi'],
      availability: 'Evenings & weekends',
      teachingStyle: 'Diagram-led revision with weekly mock tests.',
      onlineTeaching: true,
      homeTuition: true,
      verified: true,
      topTen: true,
      online: true,
      initials: 'PS',
      gradient: 'from-pink-500 to-rose-500',
      rating: 4.8,
      reviewCount: 167,
      profileCompleted: true,
    },
  },
  {
    name: 'Rahul Mehta',
    email: 'rahul.tutor@teacherpoint.com',
    phone: '9988776655',
    phoneCountryCode: '+91',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    teacherProfile: {
      teacherType: 'freelancer',
      speciality: 'Full-Stack Developer & DSA Mentor',
      bio: BIOS.rahul,
      gender: 'male',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      publicLocation: 'Bengaluru, India',
      location: 'Bengaluru, India',
      subjects: ['Computer Science', 'Python'],
      teachingSubjects: teachingSubjects(['Computer Science', 'Python', 'Data Structures']),
      education: [edu('B.Tech Computer Science', 'IIT Roorkee', '2010-07-01', '2014-05-01', 'Algorithms & systems')],
      experiences: [
        exp('Software Engineer', 'Global Tech Company', '2014-07-01', '2020-12-01', 'Backend & platform teams'),
        exp('Coding Mentor', 'Independent', '2021-01-01', '', 'Interview prep & projects'),
      ],
      yearsOfExperience: 10,
      experience: 10,
      hourlyRate: 30,
      currency: 'INR',
      languages: ['English', 'Hindi'],
      availability: 'Daily · Flexible slots',
      teachingStyle: 'Project-based learning with code reviews.',
      onlineTeaching: true,
      homeTuition: false,
      verified: true,
      topTen: true,
      online: true,
      initials: 'RM',
      gradient: 'from-indigo-500 to-violet-500',
      rating: 4.9,
      reviewCount: 421,
      profileCompleted: true,
    },
  },
  {
    name: 'Emma Smith',
    email: 'emma.tutor@teacherpoint.com',
    phone: '7700900123',
    phoneCountryCode: '+44',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
    teacherProfile: {
      teacherType: 'individual',
      speciality: 'English Literature & Communication',
      bio: BIOS.emma,
      gender: 'female',
      country: 'United Kingdom',
      state: 'England',
      city: 'London',
      publicLocation: 'London, UK',
      location: 'London, UK',
      subjects: ['English Literature', 'Spoken English'],
      teachingSubjects: teachingSubjects(['English Literature', 'Spoken English']),
      education: [
        edu('MA English Literature', 'University of Edinburgh', '2016-09-01', '2018-06-01', 'Essay & rhetoric focus'),
      ],
      experiences: [
        exp('Private English Tutor', 'London & Online', '2019-01-01', '', 'GCSE and A-Level support'),
      ],
      yearsOfExperience: 5,
      experience: 5,
      hourlyRate: 28,
      currency: 'GBP',
      languages: ['English'],
      availability: 'Weekdays',
      teachingStyle: 'Essay coaching with annotated draft feedback.',
      onlineTeaching: true,
      homeTuition: true,
      verified: true,
      online: false,
      initials: 'ES',
      gradient: 'from-sky-400 to-blue-600',
      rating: 4.7,
      reviewCount: 245,
      profileCompleted: true,
    },
  },
  {
    name: 'David Lee',
    email: 'david.tutor@teacherpoint.com',
    phone: '5550100099',
    phoneCountryCode: '+1',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    teacherProfile: {
      teacherType: 'individual',
      speciality: 'IELTS & Spoken English Coach',
      bio: BIOS.david,
      gender: 'male',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      publicLocation: 'Online · Global',
      location: 'online',
      subjects: ['Spoken English', 'IELTS'],
      teachingSubjects: teachingSubjects(['Spoken English', 'IELTS']),
      education: [edu('BA Linguistics', 'University of California', '2014-09-01', '2018-06-01', 'TESOL pathway')],
      experiences: [
        exp('IELTS Instructor', 'Global Language Institute', '2019-03-01', '', 'Band 7+ coaching'),
      ],
      yearsOfExperience: 4,
      experience: 4,
      hourlyRate: 25,
      currency: 'USD',
      languages: ['English'],
      availability: 'Flexible · UTC-friendly',
      teachingStyle: 'Fluency drills with recorded homework feedback.',
      onlineTeaching: true,
      homeTuition: false,
      verified: true,
      online: true,
      initials: 'DL',
      gradient: 'from-teal-400 to-cyan-600',
      rating: 4.6,
      reviewCount: 134,
      profileCompleted: true,
    },
  },
];

export function assertSeedBiosValid() {
  for (const row of TEACHER_ACCOUNT_SEEDS) {
    if (!isBioValid(row.teacherProfile.bio)) {
      throw new Error(`Seed bio for ${row.email} fails 150-word validation`);
    }
  }
}

/**
 * @param {typeof import('../models/User.model.js').default} User
 * @param {string} passwordHash
 * @param {(user: import('mongoose').Document) => boolean} computeProfileComplete
 */
export async function seedTeacherAccounts(User, passwordHash, computeProfileComplete) {
  assertSeedBiosValid();
  const created = [];
  for (const row of TEACHER_ACCOUNT_SEEDS) {
    const user = await User.create({
      name: row.name,
      email: row.email,
      passwordHash,
      role: 'teacher',
      phone: row.phone,
      phoneCountryCode: row.phoneCountryCode,
      avatarUrl: row.avatarUrl,
      isVerified: true,
      isActive: true,
      teacherProfile: {
        ...row.teacherProfile,
        profilePhoto: row.avatarUrl,
      },
    });
    user.profileComplete = computeProfileComplete(user);
    user.teacherProfile.profileCompleted = user.profileComplete;
    await user.save();
    created.push(user);
  }
  return created;
}

export function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const WORKSHOP_SEEDS = [
  {
    title: 'NEET Biology Crash Revision',
    category: 'School',
    description:
      'Intensive two-hour workshop covering high-yield NEET biology topics with live quizzes and downloadable notes.',
    offsetDays: 10,
    startTime: '10:00',
    endTime: '12:00',
    mode: 'online',
    meetingLink: 'https://meet.google.com/lookup/neet-bio-revision',
    isFree: true,
    maxStudents: 80,
    teacherEmail: 'priya.tutor@teacherpoint.com',
  },
  {
    title: 'Python for Beginners — Live Build',
    category: 'Development',
    description:
      'Build a real mini-project in Python: data parsing, APIs, and deployment basics. Laptops required.',
    offsetDays: 18,
    startTime: '18:00',
    endTime: '20:30',
    mode: 'online',
    meetingLink: 'https://meet.google.com/lookup/python-live-build',
    isFree: false,
    price: 499,
    maxStudents: 40,
    teacherEmail: 'rahul.tutor@teacherpoint.com',
  },
  {
    title: 'IELTS Speaking Masterclass',
    category: 'Languages',
    description:
      'Band 7+ speaking strategies, cue-card practice, and examiner-style feedback in a small group format.',
    offsetDays: 25,
    startTime: '09:00',
    endTime: '11:00',
    mode: 'online',
    meetingLink: 'https://meet.google.com/lookup/ielts-speaking',
    isFree: true,
    maxStudents: 30,
    teacherEmail: 'david.tutor@teacherpoint.com',
  },
  {
    title: 'AP Physics Problem Solving Lab',
    category: 'School',
    description:
      'Mechanics and electromagnetism problem sets with step-by-step solutions for AP and advanced high school learners.',
    offsetDays: 14,
    startTime: '16:00',
    endTime: '18:00',
    mode: 'online',
    meetingLink: 'https://meet.google.com/lookup/ap-physics-lab',
    isFree: true,
    maxStudents: 50,
    teacherEmail: 'teacher@teacherpoint.com',
  },
];

export const REQUIREMENT_SEEDS = [
  {
    title: 'Class 12 Physics tutor needed',
    subject: 'Physics',
    details:
      'Looking for an experienced tutor for CBSE Class 12 Physics — focus on optics, modern physics, and board exam papers twice a week.',
    mode: 'online',
    city: 'Mumbai',
    country: 'India',
    budgetPerHour: 800,
    currency: 'INR',
    level: 'high',
    jobType: 'tutoring',
  },
  {
    title: 'Python mentor for college project',
    subject: 'Python',
    details:
      'Need help building a Flask web app with authentication and a PostgreSQL database. Two sessions per week for one month.',
    mode: 'online',
    city: 'Bengaluru',
    country: 'India',
    budgetPerHour: 1200,
    currency: 'INR',
    level: 'college',
    jobType: 'tutoring',
  },
  {
    title: 'IELTS writing coach',
    subject: 'IELTS',
    details:
      'Target band 7.5. Need structured feedback on Task 1 and Task 2 essays plus weekly speaking practice.',
    mode: 'online',
    city: 'London',
    country: 'United Kingdom',
    budgetPerHour: 25,
    currency: 'GBP',
    level: 'pro',
    jobType: 'tutoring',
  },
  {
    title: 'English literature essay support',
    subject: 'English Literature',
    details:
      'A-Level student needs help with poetry analysis, essay structure, and timed writing practice before mocks.',
    mode: 'both',
    city: 'London',
    country: 'United Kingdom',
    budgetPerHour: 30,
    currency: 'GBP',
    level: 'high',
    jobType: 'assignment',
  },
];
