export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  votes?: number; 
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

/* ── Vite glob imports ── */
const mainImages = import.meta.glob<string>('/src/assets/candidates/*/*/main.{jpg,jpeg,png,webp,avif,gif}', { eager: true, import: 'default' });
const galleryImages = import.meta.glob<string>('/src/assets/candidates/*/*/gallery/*.{jpg,jpeg,png,webp,avif,gif}', { eager: true, import: 'default' });
const bioFiles = import.meta.glob<string>('/src/assets/candidates/*/*/bio.txt', { eager: true, query: '?raw', import: 'default' });
const voteFiles = import.meta.glob<string>('/src/assets/candidates/*/*/votes.txt', { eager: true, query: '?raw', import: 'default' });
const facebookFiles = import.meta.glob<string>('/src/assets/candidates/*/*/facebook.txt', { eager: true, query: '?raw', import: 'default' });
const twitterFiles = import.meta.glob<string>('/src/assets/candidates/*/*/twitter.txt', { eager: true, query: '?raw', import: 'default' });
const instagramFiles = import.meta.glob<string>('/src/assets/candidates/*/*/instagram.txt', { eager: true, query: '?raw', import: 'default' });

const liveVotesCache: Record<string, number> = {};

export async function fetchLiveVotes() {
  try {
    const response = await fetch('/.netlify/functions/get-votes');
    const data = await response.json();
    Object.assign(liveVotesCache, data);
  } catch (e) {
    console.error("Error fetching live votes:", e);
  }
}

export async function updateLiveVote(candidateId: string) {
  try {
    await fetch('/.netlify/functions/vote', {
      method: 'POST',
      body: JSON.stringify({ candidateId }),
    });
  } catch (e) {
    console.error("Error updating vote:", e);
  }
}

export const candidates: Candidate[] = Object.keys(mainImages).map((path) => {
  const parts = path.split('/');
  const gender = parts[4] as Gender;
  const id = parts[5];
  
  const name = id.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  
  const bioPath = `/src/assets/candidates/${gender}/${id}/bio.txt`;
  const votesPath = `/src/assets/candidates/${gender}/${id}/votes.txt`;
  const fbPath = `/src/assets/candidates/${gender}/${id}/facebook.txt`;
  const twPath = `/src/assets/candidates/${gender}/${id}/twitter.txt`;
  const igPath = `/src/assets/candidates/${gender}/${id}/instagram.txt`;

  const initialVotes = parseInt(voteFiles[votesPath] || '0', 10);
  if (!(id in liveVotesCache)) liveVotesCache[id] = initialVotes;

  const gallery = Object.keys(galleryImages)
    .filter((p) => p.includes(`/${gender}/${id}/gallery/`))
    .map((p) => galleryImages[p]);

  return {
    id,
    name,
    gender,
    image: mainImages[path],
    bio: bioFiles[bioPath] || '',
    gallery: [mainImages[path], ...gallery],
    facebook: facebookFiles[fbPath] || '',
    twitter: twitterFiles[twPath] || '',
    instagram: instagramFiles[igPath] || '',
  };
});

export function getVotes(id: string): number {
  return liveVotesCache[id] || 0;
}

export function getAllVotes(): Record<string, number> {
  return liveVotesCache;
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
  
  await updateLiveVote(candidateId);
  liveVotesCache[candidateId] = (liveVotesCache[candidateId] || 0) + 1;

  const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
  votedMap[gender] = true;
  localStorage.setItem('taj_voted', JSON.stringify(votedMap));
  
  const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
  candidateMap[gender] = candidateId;
  localStorage.setItem('taj_voted_candidate', JSON.stringify(candidateMap));
  
  return true;
}

export function getCandidatesSorted(gender: Gender): Candidate[] {
  return [...candidates]
    .filter((c) => c.gender === gender)
    .sort((a, b) => getVotes(b.id) - getVotes(a.id));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 5);
}
