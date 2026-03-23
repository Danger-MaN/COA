// ==============================
// Types
// ==============================
export type Candidate = {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  mainImage?: string;
  gallery: string[];
  bio?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  votes: number;
};

// ==============================
// Dynamic Imports
// ==============================

// كل الصور بأي صيغة
const imageModules = import.meta.glob(
  '/src/assets/candidates/**/*.{png,jpg,jpeg,webp,avif}',
  { eager: true, import: 'default' }
);

// كل ملفات النص
const textModules = import.meta.glob(
  '/src/assets/candidates/**/*.txt',
  { eager: true, import: 'default' }
);

// ==============================
// Helper Functions
// ==============================

function parsePath(path: string) {
  const parts = path.split('/');

  return {
    gender: parts[4] as 'Male' | 'Female',
    folderName: parts[5],
    fileName: parts[parts.length - 1],
  };
}

function formatName(name: string) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// ==============================
// Build Candidates
// ==============================

const candidatesMap: Record<string, Candidate> = {};

// معالجة الصور
Object.entries(imageModules).forEach(([path, value]) => {
  const { gender, folderName, fileName } = parsePath(path);

  if (!candidatesMap[folderName]) {
    candidatesMap[folderName] = {
      id: folderName,
      name: formatName(folderName),
      gender,
      gallery: [],
      votes: 0,
    };
  }

  const candidate = candidatesMap[folderName];
  const imagePath = value as string;

  // الصورة الرئيسية
  if (fileName.toLowerCase().startsWith('main')) {
    candidate.mainImage = imagePath;
    return;
  }

  // صور الجاليري
  if (path.toLowerCase().includes('/gallery/')) {
    candidate.gallery.push(imagePath);
  }
});

// معالجة ملفات النص
Object.entries(textModules).forEach(([path, value]) => {
  const { folderName, fileName } = parsePath(path);

  const candidate = candidatesMap[folderName];
  if (!candidate) return;

  const content = (value as string).toString().trim();

  switch (fileName.toLowerCase()) {
    case 'bio.txt':
      candidate.bio = content;
      break;

    case 'instagram.txt':
      candidate.instagram = content;
      break;

    case 'facebook.txt':
      candidate.facebook = content;
      break;

    case 'twitter.txt':
      candidate.twitter = content;
      break;

    case 'votes.txt':
      candidate.votes = Number(content) || 0;
      break;
  }
});

// ==============================
// Final Output
// ==============================

export const candidates: Candidate[] = Object.values(candidatesMap).sort(
  (a, b) => b.votes - a.votes // ترتيب حسب الأعلى تصويتًا
);

// ==============================
// Optional Helpers
// ==============================

// تجيب كل الذكور
export const maleCandidates = candidates.filter(c => c.gender === 'Male');

// تجيب كل الإناث
export const femaleCandidates = candidates.filter(c => c.gender === 'Female');

// تجيب مرشح بالـ id
export function getCandidateById(id: string) {
  return candidates.find(c => c.id === id);
}
