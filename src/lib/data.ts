export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  votes?: number; // أضفنا هذا الحقل لتخزين المجموع النهائي
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

/* ── Helper Functions ── */

function parsePath(path: string): { gender: Gender; folderName: string } | null {
  const decodedPath = decodeURIComponent(path);
  const match = decodedPath.match(/\/src\/assets\/candidates\/(Male|Female)\/([^/]+)\//i);
  if (!match) return null;
  return {
    gender: match[1].toLowerCase() as Gender,
    folderName: match[2],
  };
}

function readText(files: Record<string, string>, genderFolder: string, folderName: string, fileName: string): string {
  const targetFolder = folderName.toLowerCase();
  const targetFile = fileName.toLowerCase();
  const targetGender = genderFolder.toLowerCase();

  const key = Object.keys(files).find(k => {
    const decodedKey = decodeURIComponent(k).toLowerCase();
    return decodedKey.includes(`/${targetGender}/${targetFolder}/${targetFile}`);
  });

  return (key ? files[key] : '').trim();
}

function buildCandidates(): Candidate[] {
  const seen = new Set<string>();
  const results: Candidate[] = [];

  for (const path of Object.keys(mainImages)) {
    const info = parsePath(path);
    if (!info) continue;

    const key = `${info.gender}-${info.folderName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const genderFolder = info.gender === 'male' ? 'Male' : 'Female';
    const folderName = info.folderName;

    const galleryPrefix = `/src/assets/candidates/${genderFolder}/${folderName}/gallery/`.toLowerCase();
    const gallery = Object.entries(galleryImages)
      .filter(([p]) => decodeURIComponent(p).toLowerCase().includes(galleryPrefix))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, url]) => url);

    const mainImg = mainImages[path];

    results.push({
      id: `${info.gender[0]}-${folderName}`,
      name: folderName.replace(/-/g, ' '), 
      bio: readText(bioFiles, genderFolder, folderName, 'bio.txt'),
      gender: info.gender,
      image: mainImg,
      gallery: [mainImg, ...gallery],
      facebook: readText(facebookFiles, genderFolder, folderName, 'facebook.txt') || undefined,
      twitter: readText(twitterFiles, genderFolder, folderName, 'twitter.txt') || undefined,
      instagram: readText(instagramFiles, genderFolder, folderName, 'instagram.txt') || undefined,
    });
  }
  return results;
}

export const candidates: Candidate[] = buildCandidates();

/* ── Votes Mapping (Static) ── */
const votesMap: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  candidates.forEach(c => {
    const genderFolder = c.gender === 'male' ? 'Male' : 'Female';
    const folderNameFromId = c.id.split('-').slice(1).join('-');
    const raw = readText(voteFiles, genderFolder, folderNameFromId, 'votes.txt');
    map[c.id] = parseInt(raw, 10) || 0;
  });
  return map;
})();

/* ── Live Votes Cache ── */
let liveVotesCache: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

/* ── Live Data Fetching (with caching) ── */
export async function fetchAllLiveVotes(forceRefresh = false): Promise<Record<string, number>> {
  const now = Date.now();
  if (!forceRefresh && liveVotesCache && (now - lastFetchTime) < CACHE_TTL) {
    return liveVotesCache;
  }

  try {
    const response = await fetch('/.netlify/functions/vote-api?action=getAll');
    if (!response.ok) throw new Error('Failed to fetch live votes');
    const data = await response.json();
    liveVotesCache = data;
    lastFetchTime = now;
    return liveVotesCache;
  } catch {
    return {};
  }
}

export async function fetchLiveVotes(candidateId: string): Promise<number> {
  try {
    const response = await fetch(`/.netlify/functions/vote-api?id=${encodeURIComponent(candidateId)}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.votes || 0;
  } catch {
    return 0;
  }
}

export async function updateLiveVote(candidateId: string, action: 'vote' | 'undo'): Promise<number> {
  try {
    const response = await fetch(`/.netlify/functions/vote-api?id=${encodeURIComponent(candidateId)}&action=${action}`, {
      method: 'POST'
    });
    const data = await response.json();
    // بعد التحديث، نُحدّث الكاش (إذا كان موجوداً) ونُعيد ضبط الوقت
    if (liveVotesCache[candidateId] !== undefined) {
      liveVotesCache[candidateId] = data.votes;
    }
    return data.votes || 0;
  } catch {
    return 0;
  }
}

/* ── Refresh all live votes (public API) ── */
export async function refreshLiveVotes(): Promise<Record<string, number>> {
  return await fetchAllLiveVotes(true);
}

/* ── Get total votes (static + live) for a candidate ── */
export async function getTotalVotes(candidateId: string): Promise<number> {
  const staticVotes = votesMap[candidateId] || 0;
  const liveVotes = await fetchLiveVotes(candidateId);
  return staticVotes + liveVotes;
}

/* ── Exported Functions (compatible with existing code) ── */
export function getVotes(candidateId: string): number {
  // للتوافق مع الكود القديم الذي يتوقع قيمة فورية (غير متزامنة)
  return votesMap[candidateId] || 0;
}

export function getAllVotes(): Record<string, number> {
  return { ...votesMap };
}

export function getCandidateById(id: string | undefined): Candidate | undefined {
  if (!id) return undefined;
  const targetId = decodeURIComponent(id);
  return candidates.find(c => c.id === targetId || decodeURIComponent(c.id) === targetId);
}

/* ── Functions that combine static + live votes (async) ── */
export async function getCandidatesLive(gender: Gender): Promise<Candidate[]> {
  const liveVotes = await fetchAllLiveVotes();
  
  return candidates
    .filter(c => c.gender === gender)
    .map(c => ({
      ...c,
      votes: (votesMap[c.id] || 0) + (liveVotes[c.id] || 0)
    }))
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

export async function getTop5Live(gender: Gender): Promise<Candidate[]> {
  const allSorted = await getCandidatesLive(gender);
  return allSorted.slice(0, 5);
}

/* ── Local Persistence (unchanged) ── */

export function hasVoted(gender: Gender): boolean {
  try {
    const voted = localStorage.getItem('taj_voted');
    return voted ? !!JSON.parse(voted)[gender] : false;
  } catch { return false; }
}

export function getVotedCandidateId(gender: Gender): string | null {
  try {
    const stored = localStorage.getItem('taj_voted_candidate');
    return stored ? JSON.parse(stored)[gender] || null : null;
  } catch { return null; }
}

export function castVote(candidateId: string, gender: Gender): boolean {
  if (hasVoted(gender)) return false;
  const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
  votedMap[gender] = true;
  localStorage.setItem('taj_voted', JSON.stringify(votedMap));
  const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
  candidateMap[gender] = candidateId;
  localStorage.setItem('taj_voted_candidate', JSON.stringify(candidateMap));
  document.cookie = `voted_${gender}=true; max-age=${60 * 60 * 24 * 365}; path=/`;
  return true;
}

export function undoVote(gender: Gender): boolean {
  const id = getVotedCandidateId(gender);
  if (!id) return false;
  const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
  delete votedMap[gender];
  localStorage.setItem('taj_voted', JSON.stringify(votedMap));
  const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
  delete candidateMap[gender];
  localStorage.setItem('taj_voted_candidate', JSON.stringify(candidateMap));
  document.cookie = `voted_${gender}=; max-age=0; path=/`;
  return true;
}

// Legacy sync functions (for components that don't use live votes)
export function getCandidatesSorted(gender: Gender): Candidate[] {
  return [...candidates]
    .filter(c => c.gender === gender)
    .sort((a, b) => (votesMap[b.id] || 0) - (votesMap[a.id] || 0));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 10);
}
