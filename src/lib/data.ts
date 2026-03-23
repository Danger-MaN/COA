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

// 1. استيراد كافة الملفات النصية والصور من مجلد الـ public (أو assets) برمجياً
// ملاحظة: Vite سيعامل هذه الملفات كـ "Raw Strings" أي سيجلب النص اللي جواها
const textFiles = import.meta.glob('/public/candidates/**/*.txt', { eager: true, query: '?raw', import: 'default' });

// 2. مصفوفة الشخصيات التي قمت بتعديلها
const MALE_CANDIDATES = [
  { name: 'إدريس مجدي', galleryCount: 7, facebook: '#', instagram: '#' }, 
  { name: 'Mohamed Ossama', galleryCount: 4 },
  { name: 'Ahmed Wael', galleryCount: 4 },
  { name: 'Ahmed ElDeeb', galleryCount: 4 },
  { name: 'Ahmed Mohsen', galleryCount: 3 },
  { name: 'Ahmed Khalili', galleryCount: 3 }
];

const FEMALE_CANDIDATES = [
  { name: 'Emma El Torky', galleryCount: 4, instagram: '#' },
  { name: 'Rania Rashwan', galleryCount: 1, instagram: '#' },
  { name: 'Helen Hassan', galleryCount: 1 }
];

// 3. دالة بناء البيانات وربط الملفات النصية والصور
const createCandidate = (data: any, gender: Gender): Candidate => {
  const folderName = data.name;
  const genderPath = gender === 'male' ? 'Male' : 'Female';
  const basePublicPath = `/candidates/${genderPath}/${folderName}`;
  const baseInternalPath = `/public/candidates/${genderPath}/${folderName}`;

  // جلب محتوى الملفات النصية (Bio, Votes)
  const bio = (textFiles[`${baseInternalPath}/bio.txt`] as string) || "";
  const votesStr = (textFiles[`${baseInternalPath}/votes.txt`] as string) || "0";
  const initialVotes = parseInt(votesStr.trim()) || 0;

  // جلب الروابط الاجتماعية من الملفات إذا لم تكن محددة في المصفوفة
  const fb = data.facebook !== '#' ? data.facebook : (textFiles[`${baseInternalPath}/facebook.txt`] as string);
  const ig = data.instagram !== '#' ? data.instagram : (textFiles[`${baseInternalPath}/instagram.txt`] as string);

  return {
    id: folderName.toLowerCase().replace(/\s+/g, '-'),
    name: folderName,
    bio: bio,
    gender: gender,
    image: `${basePublicPath}/main.jpg`,
    gallery: [
      `${basePublicPath}/main.jpg`,
      ...Array.from({ length: data.galleryCount }, (_, i) => `${basePublicPath}/gallery/${i + 1}.jpg`)
    ],
    initialVotes: initialVotes,
    facebook: fb || '#',
    instagram: ig || '#',
    twitter: '#'
  };
};

export const candidates: Candidate[] = [
  ...MALE_CANDIDATES.map(c => createCandidate(c, 'male')),
  ...FEMALE_CANDIDATES.map(c => createCandidate(c, 'female'))
];

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت (تم استعادة كافة الدوال لضمان عدم حدوث خطأ Build)
// ─────────────────────────────────────────────────────────────────────────────

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  
  const initialMap: Record<string, number> = {};
  candidates.forEach(c => { initialMap[c.id] = c.initialVotes; });

  if (stored) {
    const storedMap = JSON.parse(stored);
    Object.keys(initialMap).forEach(id => {
      if (storedMap[id] !== undefined) {
        initialMap[id] = storedMap[id];
      }
    });
  }
  return initialMap;
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
