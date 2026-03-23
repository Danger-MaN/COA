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

// 1. تعريف قائمة أسماء المجلدات (أدخل أسماء الفولدرات التي تضعها في public/candidates هنا)
// هذا يجعل الكود يعرف بالضبط أين يبحث دون تخمين
const MALE_CANDIDATES = ['إدريس مجدي', 'Omar Al-Rukhami']; 
const FEMALE_CANDIDATES = ['Emma El Torky', 'Modern Cleopatra'];

// 2. دالة بناء بيانات الشخصية من المسارات المباشرة
const createCandidate = (folderName: string, gender: Gender): Candidate => {
  const base = `/candidates/${gender === 'male' ? 'Male' : 'Female'}/${folderName}`;
  
  return {
    id: folderName.toLowerCase().replace(/\s+/g, '-'),
    name: folderName,
    gender: gender,
    image: `${base}/main.jpg`, // يفترض وجود main.jpg دائماً
    gallery: [
      `${base}/main.jpg`,
      `${base}/gallery/1.jpg`,
      `${base}/gallery/2.jpg`,
      `${base}/gallery/3.jpg`,
      `${base}/gallery/4.jpg`,
      `${base}/gallery/5.jpg`,
      `${base}/gallery/6.jpg`,
      `${base}/gallery/7.jpg`,
      `${base}/gallery/8.jpg`,
      `${base}/gallery/9.jpg`,
      `${base}/gallery/10.jpg`
    ],
    bio: '', // سيتم ملؤها لاحقاً إذا أردت جلبها بـ fetch
    facebook: '#', 
    instagram: '#'
  };
};

// 3. تجميع كل الشخصيات في المصفوفة الأساسية
export const candidates: Candidate[] = [
  ...MALE_CANDIDATES.map(name => createCandidate(name, 'male')),
  ...FEMALE_CANDIDATES.map(name => createCandidate(name, 'female'))
];

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت (نفس الكود الأصلي تماماً للحفاظ على بياناتك)
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
