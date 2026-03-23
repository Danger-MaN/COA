export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  initialVotes: number;
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// 1. تعريف القائمة التي قمت بإضافتها
const MALE_CANDIDATES_LIST = [
  { name: 'إدريس مجدي', galleryCount: 7, facebook: '#', instagram: '#' }, 
  { name: 'Mohamed Ossama', galleryCount: 4 },
  { name: 'Ahmed Wael', galleryCount: 4 },
  { name: 'Ahmed ElDeeb', galleryCount: 4, facebook: '#', instagram: '#' },
  { name: 'Ahmed Mohsen', galleryCount: 3, facebook: '#', instagram: '#' },
  { name: 'Ahmed Khalili', galleryCount: 3 }
];

const FEMALE_CANDIDATES_LIST = [
  { name: 'Emma El Torky', galleryCount: 4, instagram: '#' },
  { name: 'Rania Rashwan', galleryCount: 1, instagram: '#' },
  { name: 'Helen Hassan', galleryCount: 1 }
];

// 2. وظيفة لجلب النصوص من الملفات (fetch)
// سنستخدم هذه الوظيفة داخل الواجهة أو عند الحاجة، ولكن هنا سنجهز المسارات
const getCandidatePath = (name: string, gender: Gender) => 
  `/candidates/${gender === 'male' ? 'Male' : 'Female'}/${name}`;

export const candidates: Candidate[] = [
  ...MALE_CANDIDATES_LIST.map(c => ({
    id: c.name.toLowerCase().replace(/\s+/g, '-'),
    name: c.name,
    bio: '', // سيتم تحميلها عبر fetch في المكون (Component)
    gender: 'male' as Gender,
    image: `${getCandidatePath(c.name, 'male')}/main.jpg`,
    gallery: [
      `${getCandidatePath(c.name, 'male')}/main.jpg`,
      ...Array.from({ length: c.galleryCount }, (_, i) => `${getCandidatePath(c.name, 'male')}/gallery/${i + 1}.jpg`)
    ],
    initialVotes: 0, // سيتم تحديثها ديناميكياً
    facebook: c.facebook,
    instagram: c.instagram
  })),
  ...FEMALE_CANDIDATES_LIST.map(c => ({
    id: c.name.toLowerCase().replace(/\s+/g, '-'),
    name: c.name,
    bio: '',
    gender: 'female' as Gender,
    image: `${getCandidatePath(c.name, 'female')}/main.jpg`,
    gallery: [
      `${getCandidatePath(c.name, 'female')}/main.jpg`,
      ...Array.from({ length: c.galleryCount }, (_, i) => `${getCandidatePath(c.name, 'female')}/gallery/${i + 1}.jpg`)
    ],
    initialVotes: 0,
    instagram: c.instagram
  }))
];

// 3. وظيفة جلب البيانات النصية (Bio & Votes) - استدعيها في ملف الـ Component الخاص بالبروفايل
export async function fetchCandidateData(candidate: Candidate) {
  const base = getCandidatePath(candidate.name, candidate.gender);
  try {
    const [bioRes, votesRes] = await Promise.all([
      fetch(`${base}/bio.txt`).then(r => r.ok ? r.text() : ""),
      fetch(`${base}/votes.txt`).then(r => r.ok ? r.text() : "0")
    ]);
    return {
      bio: bioRes.trim(),
      votes: parseInt(votesRes.trim()) || 0
    };
  } catch (e) {
    return { bio: "", votes: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت (تم استعادة الأكواد بالكامل لمنع أخطاء الـ Build)
// ─────────────────────────────────────────────────────────────────────────────

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  return stored ? JSON.parse(stored) : {};
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
  return voted ? JSON.parse(voted)[gender] || false : false;
}

export function getVotedCandidateId(gender: Gender): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(VOTED_CANDIDATE_KEY);
  return stored ? JSON.parse(stored)[gender] || null : null;
}

export function castVote(candidateId: string, gender: Gender): boolean {
  if (hasVoted(gender)) return false;
  const votes = getVotesMap();
  votes[candidateId] = (votes[candidateId] || 0) + 1;
  saveVotesMap(votes);

  const votedMap = JSON.parse(localStorage.getItem(VOTED_KEY) || '{}');
  votedMap[gender] = true;
  localStorage.setItem(VOTED_KEY, JSON.stringify(votedMap));

  const candidateMap = JSON.parse(localStorage.getItem(VOTED_CANDIDATE_KEY) || '{}');
  candidateMap[gender] = candidateId;
  localStorage.setItem(VOTED_CANDIDATE_KEY, JSON.stringify(candidateMap));

  document.cookie = `voted_${gender}=true; max-age=${60 * 60 * 24 * 365}; path=/`;
  return true;
}

export function undoVote(gender: Gender): boolean {
  const candidateId = getVotedCandidateId(gender);
  if (!candidateId) return false;

  const votes = getVotesMap();
  if (votes[candidateId] > 0) votes[candidateId] -= 1;
  saveVotesMap(votes);

  const votedMap = JSON.parse(localStorage.getItem(VOTED_KEY) || '{}');
  delete votedMap[gender];
  localStorage.setItem(VOTED_KEY, JSON.stringify(votedMap));

  const candidateMap = JSON.parse(localStorage.getItem(VOTED_CANDIDATE_KEY) || '{}');
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
