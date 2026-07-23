/**
 * TeacherOn-style “Top subjects and skills” — marked popular in the master catalog.
 * Exact display spellings match the public listing where practical.
 */

/** @type {string[]} */
export const TOP_SUBJECTS_AND_SKILLS = [
  'Academic Writing',
  'Analog Electronics',
  'BioChemistry',
  'C/C++',
  'Commerce',
  'Computer Science',
  '.net',
  'English',
  'French',
  'HTML',
  'Jquery and JavaScript',
  'Microbiology',
  'Political Science',
  'R',
  'Statistics',
  'Accountancy',
  'Art and Craft',
  'Biology',
  'C#',
  'Communication Skills',
  'Control Systems',
  'Economics',
  'Environmental Science',
  'Geography',
  'IELTS',
  'Law',
  'Music',
  'Programming',
  'Science',
  'Strength of Materials',
  'Adobe Photoshop',
  'AutoCAD',
  'Biotechnology',
  'Chemistry',
  'Company Law',
  'DBMS',
  'Electrical Engineering',
  'Financial Management',
  'German',
  'Income Tax',
  'Maths',
  'PHP',
  'Psychology',
  'Selenium Webdriver',
  'Thermodynamics',
  'Algorithm & Data Structures',
  'Basic Electronics',
  'Business Management',
  'Civil Engineering',
  'Computer networking',
  'Digital Electronics',
  'Engineering Mechanics',
  'Fluid Mechanics',
  'History',
  'JAVA',
  'Mechanical',
  'Physics',
  'Python',
  'Sociology',
  'Zoology',
];

/** Best-effort group for top list entries when first seeded. */
export function topSubjectGroup(name) {
  const n = name.toLowerCase();
  if (
    /math|physics|chemistry|biology|science|zoology|microbiology|biochem|biotech|geography|history|statistics|thermodynamics|fluid|strength of materials|engineering|electronics|mechanics|control systems|networking|dbms/.test(
      n,
    )
  ) {
    if (/law|tax|company law/.test(n)) return 'law';
    if (/engineering|electronics|mechanics|thermodynamics|fluid|autocad|control|networking|dbms|selenium|\.net|c\+\+|c#|java|python|php|html|jquery|programming|algorithm|r$/.test(n)) {
      return 'engineering';
    }
    return 'academic';
  }
  if (/english|french|german|ielts|communication/.test(n)) return 'language';
  if (/java|python|php|html|jquery|c\+\+|c#|\.net|programming|algorithm|selenium|dbms|r$/.test(n)) {
    return 'programming';
  }
  if (/account|commerce|econom|financial|business|income tax/.test(n)) return 'business';
  if (/law/.test(n)) return 'law';
  if (/photoshop|art and craft|music/.test(n)) return 'arts';
  if (/psychology|sociology|political|academic writing/.test(n)) return 'humanities';
  return 'other';
}
