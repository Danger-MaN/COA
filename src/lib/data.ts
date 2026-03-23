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
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// دالة سحرية لجلب مسار أي ملف داخل مجلد candidates بشكل ديناميكي
const getAssetUrl = (path: string) => {
  // نقوم بتمرير المسار النسبي من مجلد assets
  return new URL(`./assets/candidates/${path}`, import.meta.url).href;
};

// مصفوفة الشخصيات - الآن يمكنك إضافة أي شخصية ببساطة بتكرار الكائن
export const candidates: Candidate[] = [
  {
    id: 'm1',
    nameAr: 'يوسف الأثري',
    nameEn: 'Youssef Al-Athari',
    gender: 'male',
    // المسار هنا يبدأ من داخل مجلد candidates
    image: getAssetUrl('Male/YousefAlAthari/main.jpg'),
    gallery: [
      getAssetUrl('Male/YousefAlAthari/main.jpg'),
      getAssetUrl('Male/YousefAlAthari/gallery/1.jpg'),
      getAssetUrl('Male/YousefAlAthari/gallery/2.jpg'),
    ],
    bioAr: "نص السيرة الذاتية هنا...", // أو يمكنك جلبها كـ String عادي
    bioEn: "Bio text here...",
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com'
  },
  {
    id: 'm2',
    nameAr: 'أحمد وائل',
    nameEn: 'Ahmed Wael',
    gender: 'male',
    image: getAssetUrl('Male/AhmedWael/main.jpg'),
    gallery: [
      getAssetUrl('Male/AhmedWael/main.jpg'),
      getAssetUrl('Male/AhmedWael/gallery/1.jpg'),
    ],
    bioAr: "سيرة ذاتية لأحمد وائل",
    bioEn: "Ahmed Wael Bio",
    facebook: 'https://facebook.com/ahmed'
  }
];

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
