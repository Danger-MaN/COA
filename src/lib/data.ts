export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

/**
 * شرح التعديل: 
 * 1. نستخدم eager: true لجلب البيانات أثناء البناء.
 * 2. نقوم بتنظيف المسار الناتج ليحذف كلمة "public" تماماً، لأن المتصفح يرى ما بداخل public كأنه في الجذر.
 */

const imageModules = import.meta.glob('/public/candidates/**/*.{jpg,jpeg,png,webp,svg,JPG}', { eager: true, import: 'default' });
const textModules = import.meta.glob('/public/candidates/**/*.txt', { eager: true, import: 'default', query: '?raw' });

const candidatesMap: Record<string, Partial<Candidate>> = {};

// معالجة الصور
Object.keys(imageModules).forEach((path) => {
  const parts = path.split('/');
  const gender = path.toLowerCase().includes('/male/') ? 'male' : 'female';
  const folderName = parts[parts.length - 2]; 
  const fileName = parts[parts.length - 1];
  
  // تصحيح المسار: حذف "/public" ليعمل في المتصفح
  // من: /public/candidates/Male/Name/main.jpg
  // إلى: /candidates/Male/Name/main.jpg
  const browserPath = path.replace('/public', '');

  if (!candidatesMap[folderName]) {
    candidatesMap[folderName] = {
      id: folderName,
      name: folderName,
      gender,
      gallery: [],
      bio: ''
    };
  }

  if (fileName.toLowerCase().startsWith('main')) {
    candidatesMap[folderName].image = browserPath;
  } else if (path.toLowerCase().includes('/gallery/')) {
    candidatesMap[folderName].gallery?.push(browserPath);
  }
});

// معالجة النصوص
Object.keys(textModules).forEach((path) => {
  const parts = path.split('/');
  const folderName = parts[parts.length - 2];
  const fileName = parts[parts.length - 1].toLowerCase();
  const content = (textModules[path] as string).trim();

  if (candidatesMap[folderName]) {
    if (fileName === 'bio.txt') candidatesMap[folderName].bio = content;
    if (fileName === 'facebook.txt') candidatesMap[folderName].facebook = content;
    if (fileName === 'twitter.txt') candidatesMap[folderName].twitter = content;
    if (fileName === 'instagram.txt') candidatesMap[folderName].instagram = content;
  }
});

export const candidates = Object.values(candidatesMap) as Candidate[];

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت (المحافظة على الأكواد القديمة)
// ─────────────────────────────────────────────────────────────────────────────

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  if (stored) return JSON.parse(stored);
  
  const initial: Record<string, number> = {};
  candidates.forEach(c => { initial[c.id] = 0; });
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
