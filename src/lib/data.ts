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

/* ── Vite glob imports (build-time) ── */
const mainImages = import.meta.glob<string>(
  '/src/assets/candidates/*/*/main.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true, import: 'default' }
);

const galleryImages = import.meta.glob<string>(
  '/src/assets/candidates/*/*/gallery/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true, import: 'default' }
);

const bioFiles = import.meta.glob<string>(
  '/src/assets/candidates/*/*/bio.txt',
  { eager: true, query: '?raw', import: 'default' }
);

const voteFiles = import.meta.glob<string>(
  '/src/assets/candidates/*/*/votes.txt',
  { eager: true, query: '?raw', import: 'default' }
);

const facebookFiles = import.meta.glob<string>(
  '/src/assets/candidates/*/*/facebook.txt',
  { eager: true, query: '?raw', import: 'default' }
);

const twitterFiles = import.meta.glob<string>(
  '/src/assets/candidates/*/*/twitter.txt',
  { eager: true, query: '?raw', import: 'default' }
);

const instagramFiles = import.meta.glob<string>(
  '/src/assets/candidates/*/*/instagram.txt',
  { eager: true, query: '?raw', import: 'default' }
);

/* ── Parse path: /src/assets/candidates/{Gender}/{Name}/... ── */
function parsePath(path: string): { gender: Gender; folderName: string } | null {
  const match = path.match(/\/src\/assets\/candidates\/(Male|Female)\/([^/]+)\//);
  if (!match) return null;
  return {
    gender: match[1].toLowerCase() as Gender,
    folderName: match[2],
  };
}

function readText(files: Record<string, string>, gender: string, name: string, file: string): string {
  const key = `/src/assets/candidates/${gender}/${name}/${file}`;
  return (files[key] || '').trim();
}

function buildCandidates(): Candidate[] {
  // Discover all candidates from mainImages keys
  const seen = new Set<string>();
  const results: Candidate[] = [];

  for (const path of Object.keys(mainImages)) {
    const info = parsePath(path);
    if (!info) continue;
    const key = `${info.gender}-${info.folderName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const genderFolder = info.gender === 'male' ? 'Male' : 'Female';
    const name = info.folderName;

    // Collect gallery images sorted by filename
    const galleryPrefix = `/src/assets/candidates/${genderFolder}/${name}/gallery/`;
    const gallery = Object.entries(galleryImages)
      .filter(([p]) => p.startsWith(galleryPrefix))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, url]) => url);

    const mainImg = mainImages[path];
    const allImages = [mainImg, ...gallery];

    const fb = readText(facebookFiles, genderFolder, name, 'facebook.txt');
    const tw = readText(twitterFiles, genderFolder, name, 'twitter.txt');
    const ig = readText(instagramFiles, genderFolder, name, 'instagram.txt');

    results.push({
      id: `${info.gender[0]}-${encodeURIComponent(name)}`,
      name: name, // Use folder name as-is (supports spaces)
      bio: readText(bioFiles, genderFolder, name, 'bio.txt'),
      gender: info.gender,
      image: mainImg,
      gallery: allImages,
      facebook: fb || undefined,
      twitter: tw || undefined,
      instagram: ig || undefined,
    });
  }

  return results;
}

export const candidates: Candidate[] = buildCandidates();

/* ── Votes (read from votes.txt at build time) ── */
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesFromFiles(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of candidates) {
    const genderFolder = c.gender === 'male' ? 'Male' : 'Female';
    const folderName = decodeURIComponent(c.id.slice(2));
    const raw = readText(voteFiles, genderFolder, folderName, 'votes.txt');
    result[c.id] = parseInt(raw, 10) || 0;
  }
  return result;
}

const votesMap = getVotesFromFiles();

export function getVotes(candidateId: string): number {
  return votesMap[candidateId] || 0;
}

export function getAllVotes(): Record<string, number> {
  return { ...votesMap };
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
  const votes = getAllVotes();
  return candidates
    .filter(c => c.gender === gender)
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 5);
}
