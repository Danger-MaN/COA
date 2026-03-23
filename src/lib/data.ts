export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string; // اسم الفولدر كما هو
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// 1. جلب كل ملفات الصور من مجلد candidates (تأكد من المسار الصحيح حسب مكان الفولدر عندك)
// إذا نقلت الفولدر لـ public، استخدم المسار النسبي له من هذا الملف
const imageModules = import.meta.glob('/public/candidates/**/*.{jpg,jpeg,png,webp,svg}', { eager: true, import: 'default' });
const textModules = import.meta.glob('/public/candidates/**/*.txt', { eager: true, import: 'default', query: '?raw' });

const candidatesMap: Record<string, Partial<Candidate>> = {};

// 2. معالجة الصور وبناء الهيكل الأساسي
Object.keys(imageModules).forEach((path) => {
  const parts = path.split('/');
  const gender = path.toLowerCase().includes('/male/') ? 'male' : 'female';
  const folderName = parts[parts.length - 2]; // اسم الشخصية
  const fileName = parts[parts.length - 1];
  
  // تنظيف المسار ليكون صالحاً للاستخدام في المتصفح (حذف /public)
  const browserPath = path.replace('/public', '');

  if (!candidatesMap[folderName]) {
    candidatesMap[folderName] = {
      id: folderName.toLowerCase().replace(/\s+/g, '-'),
      name: folderName,
      gender,
      gallery: [],
      bio: ''
    };
  }

  if (fileName.toLowerCase().startsWith('main')) {
    candidatesMap[folderName].image = browserPath;
  } else if (path.includes('/gallery/')) {
    candidatesMap[folderName].gallery?.push(browserPath);
  }
});

// 3. معالجة الملفات النصية (Bio والروابط)
Object.keys(textModules).forEach((path) => {
  const parts = path.split('/');
  const folderName = parts[parts.length - 2];
  const fileName = parts[parts.length - 1];
  const content = (textModules[path] as string).trim();

  if (candidatesMap[folderName]) {
    if (fileName === 'bio.txt') candidatesMap[folderName].bio = content;
    if (fileName === 'facebook.txt') candidatesMap[folderName].facebook = content;
    if (fileName === 'twitter.txt') candidatesMap[folderName].twitter = content;
    if (fileName === 'instagram.txt') candidatesMap[folderName].instagram = content;
  }
});

export const candidates = Object.values(candidatesMap) as Candidate[];

// --- منطق التصويت الديناميكي ---
// ملاحظة: بما أن الأسماء متغيرة، سنعتمد على اسم الفولدر كـ ID للتصويت
const VOTES_KEY = 'taj_votes';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function getVotes(candidateId: string): number {
  return getVotesMap()[candidateId] || 0;
}

export function castVote(candidateId: string, gender: Gender): boolean {
  // يمكنك إضافة منطق التحقق من التصويت السابق هنا
  const votes = getVotesMap();
  votes[candidateId] = (votes[candidateId] || 0) + 1;
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  return true;
}

export function getCandidatesSorted(gender: Gender): Candidate[] {
  const votes = getVotesMap();
  return candidates
    .filter(c => c.gender === gender)
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
}
