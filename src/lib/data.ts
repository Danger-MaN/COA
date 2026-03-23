export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  nameAr: string;
  nameEn: string;
  bioAr: string;
  bioEn: string;
  gender: Gender;
  image: string;
  gallery: string[];
  initialVotes: number;
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// 1. جلب كل الصور والملفات النصية من فولدر candidates بشكل ديناميكي
const imageFiles = import.meta.glob('@/assets/candidates/**/*.{jpg,jpeg,png,webp,svg}', { eager: true, query: '?url', import: 'default' });
const textFiles = import.meta.glob('@/assets/candidates/**/*.txt', { eager: true, query: '?raw', import: 'default' });

// 2. دالة لاستخراج اسم الشخصية من المسار
const extractNameFromPath = (path: string) => {
  const parts = path.split('/');
  return parts[parts.length - 2]; // اسم الفولدر قبل الأخير هو اسم الشخصية
};

// 3. بناء مصفوفة الشخصيات برمجياً
const candidatesMap: Record<string, Partial<Candidate>> = {};

// معالجة الصور (Main & Gallery)
Object.keys(imageFiles).forEach((path) => {
  const name = extractNameFromPath(path);
  const gender = path.toLowerCase().includes('/male/') ? 'male' : 'female';
  const fileName = path.split('/').pop() || '';
  const fileUrl = imageFiles[path] as string;

  if (!candidatesMap[name]) {
    candidatesMap[name] = { id: name, nameEn: name, gender, gallery: [] };
  }

  if (fileName.startsWith('main')) {
    candidatesMap[name].image = fileUrl;
  } else if (path.includes('/gallery/')) {
    candidatesMap[name].gallery?.push(fileUrl);
  }
});

// معالجة الملفات النصية (Bio, Social, Votes)
Object.keys(textFiles).forEach((path) => {
  const name = extractNameFromPath(path);
  const fileName = path.split('/').pop() || '';
  const content = (textFiles[path] as string).trim();

  if (candidatesMap[name]) {
    if (fileName === 'bio_ar.txt') candidatesMap[name].bioAr = content;
    if (fileName === 'bio_en.txt') candidatesMap[name].bioEn = content;
    if (fileName === 'facebook.txt') candidatesMap[name].facebook = content;
    if (fileName === 'twitter.txt') candidatesMap[name].twitter = content;
    if (fileName === 'instagram.txt') candidatesMap[name].instagram = content;
    if (fileName === 'votes.txt') candidatesMap[name].initialVotes = parseInt(content) || 0;
  }
});

export const candidates = Object.values(candidatesMap) as Candidate[];

// --- بقية الدوال الخاصة بالتصويت (نفس المنطق القديم مع تعديل مفتاح التصويت الأولي) ---

const VOTES_KEY = 'taj_votes';
const INITIAL_VOTES = candidates.reduce((acc, c) => ({ ...acc, [c.id]: c.initialVotes }), {});

function getVotesMap(): Record<string, number> {
  const stored = localStorage.getItem(VOTES_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(VOTES_KEY, JSON.stringify(INITIAL_VOTES));
  return { ...INITIAL_VOTES };
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
  const voted = localStorage.getItem(VOTED_KEY);
  if (!voted) return false;
  const map: Record<string, boolean> = JSON.parse(voted);
  return !!map[gender];
}

export function getVotedCandidateId(gender: Gender): string | null {
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
