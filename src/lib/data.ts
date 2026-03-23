export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string; // الاسم الذي سيظهر للمستخدم
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  initialVotes: number; // التصويتات القادمة من الملف
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// 1. جلب محتويات الملفات النصية من public (للتصويتات والسيرة الذاتية)
// نستخدم glob لضمان أن Vite يرى الملفات ويقوم بتضمينها
const textModules = import.meta.glob('/public/candidates/**/*.txt', { eager: true, import: 'default', query: '?raw' });

// 2. إعداد قائمة الشخصيات (تأكد أن الاسم هنا يطابق اسم الفولدر بالضبط)
const MALE_CONFIG = [
  { folder: 'إدريس مجدي', galleryCount: 7, facebook: '#', instagram: '#' },
  { folder: 'Mohamed Ossama', galleryCount: 4 },
  { folder: 'Ahmed Wael', galleryCount: 4 },
  { folder: 'Ahmed ElDeeb', galleryCount: 4, facebook: '#', instagram: '#' },
  { folder: 'Ahmed Mohsen', galleryCount: 3, facebook: '#', instagram: '#' },
  { folder: 'Ahmed Khalili', galleryCount: 3 }
];

const FEMALE_CONFIG = [
  { folder: 'Emma El Torky', galleryCount: 4, instagram: '#' },
  { folder: 'Rania Rashwan', galleryCount: 1, instagram: '#' },
  { folder: 'Helen Hassan', galleryCount: 1 }
];

// 3. دالة ذكية لبناء بيانات الشخصية وربطها بملفات الـ txt
const createCandidate = (config: any, gender: Gender): Candidate => {
  const folder = config.folder;
  const base = `/candidates/${gender === 'male' ? 'Male' : 'Female'}/${folder}`;
  
  // البحث عن محتوى الملفات النصية بناءً على المسار
  const getTxtContent = (fileName: string) => {
    const path = `/public${base}/${fileName}`;
    return (textModules[path] as string) || '';
  };

  const initialVotesRaw = getTxtContent('votes.txt');
  
  return {
    id: folder.toLowerCase().replace(/\s+/g, '-'), // ID فريد للرابط
    name: folder, // سيظهر الاسم كما كتبته في المصفوفة (عربي أو إنجليزي)
    gender: gender,
    image: `${base}/main.jpg`,
    gallery: [
      `${base}/main.jpg`,
      ...Array.from({ length: config.galleryCount }, (_, i) => `${base}/gallery/${i + 1}.jpg`)
    ],
    bio: getTxtContent('bio.txt'),
    initialVotes: parseInt(initialVotesRaw) || 0,
    facebook: config.facebook,
    instagram: config.instagram,
    twitter: config.twitter
  };
};

export const candidates: Candidate[] = [
  ...MALE_CONFIG.map(c => createCandidate(c, 'male')),
  ...FEMALE_CONFIG.map(c => createCandidate(c, 'female'))
];

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت المعدل ليعتمد على initialVotes
// ─────────────────────────────────────────────────────────────────────────────

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  
  if (stored) return JSON.parse(stored);

  // إذا كانت أول مرة، نعتمد على القيم الموجودة في ملفات votes.txt
  const initial: Record<string, number> = {};
  candidates.forEach(c => {
    initial[c.id] = c.initialVotes;
  });
  localStorage.setItem(VOTES_KEY, JSON.stringify(initial));
  return initial;
}

function saveVotesMap(votes: Record<string, number>) {
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export function getVotes(candidateId: string): number {
  return getVotesMap()[candidateId] || 0;
}

export function getAllVotes(): Record<string, number> {
  return getVotesMap();
}

export function hasVoted(gender: Gender): boolean {
  if (typeof window === 'undefined') return false;
  const voted = localStorage.getItem(VOTED_KEY);
  if (!voted) return false;
  const map: Record<string, boolean> = JSON.parse(voted);
  return !!map[gender];
}

export function getVotedCandidateId(gender: Gender): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(VOTED_CANDIDATE_KEY);
  if (!stored) return null;
  const map: Record<string, string> = JSON.parse(stored);
  return map[gender] || null;
}

export function castVote(candidateId: string, gender: Gender): boolean {
  if (hasVoted(gender)) return false;
  const votes = getVotesMap();
  votes[candidateId] = (votes[candidateId] || 0) + 1;
  saveVotesMap(votes);

  const votedStr = localStorage.getItem(VOTED_KEY);
  const votedMap: Record<string, boolean> = votedStr ? JSON.parse(votedStr) : {};
  votedMap[gender] = true;
  localStorage.setItem(VOTED_KEY, JSON.stringify(votedMap));

  const candidateStr = localStorage.getItem(VOTED_CANDIDATE_KEY);
  const candidateMap: Record<string, string> = candidateStr ? JSON.parse(candidateStr) : {};
  candidateMap[gender] = candidateId;
  localStorage.setItem(VOTED_CANDIDATE_KEY, JSON.stringify(candidateMap));

  document.cookie = `voted_${gender}=true; max-age=${60 * 60 * 24 * 365}; path=/`;
  return true;
}

export function undoVote(gender: Gender): boolean {
  const candidateId = getVotedCandidateId(gender);
  if (!candidateId) return false;

  const votes = getVotesMap();
  if (votes[candidateId] && votes[candidateId] > 0) {
    votes[candidateId] -= 1;
  }
  saveVotesMap(votes);

  const votedStr = localStorage.getItem(VOTED_KEY);
  const votedMap: Record<string, boolean> = votedStr ? JSON.parse(votedStr) : {};
  delete votedMap[gender];
  localStorage.setItem(VOTED_KEY, JSON.stringify(votedMap));

  const candidateStr = localStorage.getItem(VOTED_CANDIDATE_KEY);
  const candidateMap: Record<string, string> = candidateStr ? JSON.parse(candidateStr) : {};
  delete candidateMap[gender];
  localStorage.setItem(VOTED_CANDIDATE_KEY, JSON.stringify(candidateMap));

  document.cookie = `voted_${gender}=; max-age=0; path=/`;
  return true;
}

export function getCandidatesSorted(gender: Gender): Candidate[] {
  const votes = getVotesMap();
  return candidates
    .filter(c => c.gender === gender)
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 5);
}
