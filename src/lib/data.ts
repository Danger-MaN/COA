export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  votes: number; 
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

/* ── Vite glob imports ── */
const mainImages = import.meta.glob<string>('/src/assets/candidates/*/*/main.{jpg,jpeg,png,webp,avif,gif}', { eager: true, import: 'default' });
const galleryImages = import.meta.glob<string>('/src/assets/candidates/*/*/gallery/*.{jpg,jpeg,png,webp,avif,gif}', { eager: true, import: 'default' });
const bioFiles = import.meta.glob<string>('/src/assets/candidates/*/*/bio.txt', { eager: true, query: '?raw', import: 'default' });
const voteFiles = import.meta.glob<string>('/src/assets/candidates/*/*/votes.txt', { eager: true, query: '?raw', import: 'default' });
const socialFiles = {
  facebook: import.meta.glob<string>('/src/assets/candidates/*/*/facebook.txt', { eager: true, query: '?raw', import: 'default' }),
  twitter: import.meta.glob<string>('/src/assets/candidates/*/*/twitter.txt', { eager: true, query: '?raw', import: 'default' }),
  instagram: import.meta.glob<string>('/src/assets/candidates/*/*/instagram.txt', { eager: true, query: '?raw', import: 'default' }),
};

// معالجة البيانات الأولية من الملفات النصية
const paths = Object.keys(mainImages);
export const candidates: Candidate[] = paths.map((path) => {
  const match = path.match(/\/candidates\/(male|female)\/([^/]+)\//);
  if (!match) return null as any;

  const gender = match[1] as Gender;
  const id = match[2];
  const folderPath = `/src/assets/candidates/${gender}/${id}`;

  const gallery = Object.keys(galleryImages)
    .filter((p) => p.startsWith(`${folderPath}/gallery/`))
    .map((p) => galleryImages[p]);

  const rawVotes = voteFiles[`${folderPath}/votes.txt`] || '0';

  return {
    id,
    name: id.replace(/-/g, ' '),
    gender,
    image: mainImages[path],
    gallery: [mainImages[path], ...gallery],
    bio: bioFiles[`${folderPath}/bio.txt`] || '',
    votes: parseInt(rawVotes, 10) || 0,
    facebook: socialFiles.facebook[`${folderPath}/facebook.txt`],
    twitter: socialFiles.twitter[`${folderPath}/twitter.txt`],
    instagram: socialFiles.instagram[`${folderPath}/instagram.txt`],
  };
}).filter(Boolean);

// نظام الكاش للأصوات القادمة من السيرفر
let liveVotesCache: Record<string, number> = {};

export async function fetchLiveVotes() {
  try {
    const response = await fetch('/.netlify/functions/get-votes');
    if (response.ok) {
      const data = await response.json();
      liveVotesCache = data;
      // مزامنة المصفوفة الأساسية
      candidates.forEach(c => {
        if (liveVotesCache[c.id] !== undefined) {
          c.votes = liveVotesCache[c.id];
        }
      });
      return true;
    }
  } catch (error) {
    console.error("Error fetching live votes:", error);
  }
  return false;
}

export function getVotes(id: string): number {
  if (liveVotesCache[id] !== undefined) return liveVotesCache[id];
  const candidate = candidates.find(c => c.id === id);
  return candidate?.votes || 0;
}

export function hasVoted(gender: Gender): boolean {
  if (typeof window === 'undefined') return false;
  const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
  return !!votedMap[gender];
}

export function getVotedCandidateId(gender: Gender): string | null {
  if (typeof window === 'undefined') return null;
  const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
  return candidateMap[gender] || null;
}

export async function castVote(candidateId: string, gender: Gender): Promise<boolean> {
  if (hasVoted(gender)) return false;
  try {
    const response = await fetch('/.netlify/functions/vote', {
      method: 'POST',
      body: JSON.stringify({ candidateId, gender })
    });
    if (response.ok) {
      const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
      votedMap[gender] = true;
      localStorage.setItem('taj_voted', JSON.stringify(votedMap));
      const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
      candidateMap[gender] = candidateId;
      localStorage.setItem('taj_voted_candidate', JSON.stringify(candidateMap));
      return true;
    }
  } catch (e) { console.error(e); }
  return false;
}

export function getCandidatesSorted(gender: Gender): Candidate[] {
  return [...candidates]
    .filter((c) => c.gender === gender)
    .sort((a, b) => getVotes(b.id) - getVotes(a.id));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 5);
}
