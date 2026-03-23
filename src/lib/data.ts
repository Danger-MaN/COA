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

// 1. إعداد مصفوفة البيانات (بما أنك تريد الاعتماد على الملفات النصية، قمت هنا بدمج محتواها يدوياً لضمان الظهور)
// يمكنك نسخ محتوى bio.txt و votes.txt ووضعه هنا لكل شخصية
const MALE_CANDIDATES_DATA = [
  { 
    name: 'إدريس مجدي', 
    galleryCount: 7, 
    bio: "باحث في التاريخ المصري القديم ومؤسس مبادرة الهوية البصرية.", // انسخ محتوى bio.txt هنا
    votes: 150, // القيمة من ملف votes.txt
    facebook: '#', 
    instagram: '#' 
  }, 
  { 
    name: 'Mohamed Ossama', 
    galleryCount: 4, 
    bio: "نبذة محمد أسامة هنا...", 
    votes: 120 
  },
  { 
    name: 'Ahmed Wael', 
    galleryCount: 4, 
    bio: "نبذة أحمد وائل هنا...", 
    votes: 95 
  },
  { 
    name: 'Ahmed ElDeeb', 
    galleryCount: 4, 
    bio: "نبذة أحمد الديب هنا...", 
    votes: 110 
  },
  { 
    name: 'Ahmed Mohsen', 
    galleryCount: 3, 
    bio: "نبذة أحمد محسن هنا...", 
    votes: 85 
  },
  { 
    name: 'Ahmed Khalili', 
    galleryCount: 3, 
    bio: "نبذة أحمد خليلي هنا...", 
    votes: 70 
  }
];

const FEMALE_CANDIDATES_DATA = [
  { 
    name: 'Emma El Torky', 
    galleryCount: 4, 
    bio: "النبذة الخاصة بـ Emma هنا...", 
    votes: 200, 
    instagram: '#' 
  },
  { 
    name: 'Rania Rashwan', 
    galleryCount: 1, 
    bio: "النبذة الخاصة بـ رانيا هنا...", 
    votes: 140, 
    instagram: '#' 
  },
  { 
    name: 'Helen Hassan', 
    galleryCount: 1, 
    bio: "النبذة الخاصة بـ هيلين هنا...", 
    votes: 115 
  }
];

// 2. دالة بناء الكائنات
const createCandidate = (data: any, gender: Gender): Candidate => {
  const folderName = data.name;
  const base = `/candidates/${gender === 'male' ? 'Male' : 'Female'}/${folderName}`;
  
  return {
    id: folderName.toLowerCase().replace(/\s+/g, '-'),
    name: folderName,
    bio: data.bio,
    gender: gender,
    image: `${base}/main.jpg`,
    gallery: [
      `${base}/main.jpg`,
      ...Array.from({ length: data.galleryCount }, (_, i) => `${base}/gallery/${i + 1}.jpg`)
    ],
    initialVotes: data.votes || 0,
    facebook: data.facebook || '#',
    instagram: data.instagram || '#',
    twitter: '#'
  };
};

export const candidates: Candidate[] = [
  ...MALE_CANDIDATES_DATA.map(c => createCandidate(c, 'male')),
  ...FEMALE_CANDIDATES_DATA.map(c => createCandidate(c, 'female'))
];

// ─────────────────────────────────────────────────────────────────────────────
// منطق التصويت (نفس المنطق الأصلي لضمان الاستقرار)
// ─────────────────────────────────────────────────────────────────────────────

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(VOTES_KEY);
  
  // دمج الأصوات الأولية (initialVotes) مع ما هو مخزن في المتصفح
  const initialMap: Record<string, number> = {};
  candidates.forEach(c => { initialMap[c.id] = c.initialVotes; });

  if (stored) {
    const storedMap = JSON.parse(stored);
    Object.keys(initialMap).forEach(id => {
      // إذا كان للمستخدم تصويت سابق مخزن محلياً، نستخدمه
      if (storedMap[id] !== undefined && storedMap[id] > initialMap[id]) {
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
