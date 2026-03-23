import type { Candidate, Gender } from './types'; // adjust path if needed

// Use Vite's glob import to collect all files from candidate folders.
// All patterns are relative to the project root (src/). Adjust if assets are elsewhere.
const basePath = '/src/assets/candidates';

// ---- Main images ----
const mainImages = import.meta.glob<{ default: string }>(
  `${basePath}/*/*/main.*`,
  { eager: true }
);

// ---- Text files ----
const bioFiles = import.meta.glob<string>(
  `${basePath}/*/*/bio.txt`,
  { eager: true, as: 'raw' }
);
const votesFiles = import.meta.glob<string>(
  `${basePath}/*/*/votes.txt`,
  { eager: true, as: 'raw' }
);
const instagramFiles = import.meta.glob<string>(
  `${basePath}/*/*/instagram.txt`,
  { eager: true, as: 'raw' }
);
const facebookFiles = import.meta.glob<string>(
  `${basePath}/*/*/facebook.txt`,
  { eager: true, as: 'raw' }
);
const twitterFiles = import.meta.glob<string>(
  `${basePath}/*/*/twitter.txt`,
  { eager: true, as: 'raw' }
);
const nameArFiles = import.meta.glob<string>(
  `${basePath}/*/*/name_ar.txt`,
  { eager: true, as: 'raw' }
);
const nameEnFiles = import.meta.glob<string>(
  `${basePath}/*/*/name_en.txt`,
  { eager: true, as: 'raw' }
);

// ---- Gallery images ----
const galleryFiles = import.meta.glob<{ default: string }>(
  `${basePath}/*/*/Gallery/*.*`,
  { eager: true }
);

/**
 * Extracts the candidate folder key from a file path.
 * Example: "/src/assets/candidates/Male/Ahmed Wael/main.jpg" -> "Male/Ahmed Wael"
 */
function getCandidateKey(path: string): string {
  const parts = path.split('/');
  // Expected: ..., candidates, Gender, FolderName, ... or Gender/FolderName/Gallery/...
  const genderIndex = parts.findIndex(p => p === 'Male' || p === 'Female');
  if (genderIndex === -1) throw new Error(`Invalid path: ${path}`);
  const folderName = parts[genderIndex + 1];
  if (!folderName) throw new Error(`Invalid path, missing folder name: ${path}`);
  return `${parts[genderIndex]}/${folderName}`;
}

// Build a map from candidateKey to its main image URL
const mainMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(mainImages)) {
  const key = getCandidateKey(path);
  mainMap[key] = (mod as { default: string }).default;
}

// Build map from candidateKey to gallery image URLs (sorted naturally)
const galleryMap: Record<string, string[]> = {};
for (const [path, mod] of Object.entries(galleryFiles)) {
  const key = getCandidateKey(path);
  if (!galleryMap[key]) galleryMap[key] = [];
  galleryMap[key].push((mod as { default: string }).default);
}
// Sort gallery images by filename (natural order) for consistency
for (const key in galleryMap) {
  galleryMap[key].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Helper to read text file content from a map
function getTextContent(map: Record<string, string>, key: string): string | undefined {
  return map[key]?.trim();
}

// Build candidate objects using the collected data
const candidateKeys = Object.keys(mainMap);
const builtCandidates: Candidate[] = [];

for (const key of candidateKeys) {
  const [genderStr, folderName] = key.split('/');
  const gender = genderStr.toLowerCase() as Gender;
  // ID: gender + underscore + folder name slugified (spaces removed)
  const id = `${gender}_${folderName.replace(/\s+/g, '_')}`;

  // Names: try reading from name_ar.txt / name_en.txt, otherwise fallback to folder name
  const nameAr = getTextContent(nameArFiles, key) || folderName;
  const nameEn = getTextContent(nameEnFiles, key) || folderName;

  // Bio: use the same text for both languages (single bio.txt)
  const bio = getTextContent(bioFiles, key) || '';
  const bioAr = bio;
  const bioEn = bio;

  // Social links
  const instagram = getTextContent(instagramFiles, key);
  const facebook = getTextContent(facebookFiles, key);
  const twitter = getTextContent(twitterFiles, key);

  // Votes: read from votes.txt
  const votesRaw = getTextContent(votesFiles, key);
  const initialVote = votesRaw ? parseInt(votesRaw, 10) : 0;

  // Image and gallery
  const image = mainMap[key];
  const gallery = galleryMap[key] ? [image, ...galleryMap[key]] : [image]; // main image first

  builtCandidates.push({
    id,
    nameAr,
    nameEn,
    bioAr,
    bioEn,
    gender,
    image,
    gallery,
    facebook,
    twitter,
    instagram,
  });
}

// Export the dynamically built candidates array
export const candidates: Candidate[] = builtCandidates;

// ---- Vote storage & helpers (unchanged logic, but initial votes are dynamic) ----
const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

// Build initial votes map from votes.txt values
const INITIAL_VOTES: Record<string, number> = {};
for (const candidate of candidates) {
  const votesFileKey = `${candidate.gender === 'male' ? 'Male' : 'Female'}/${candidate.nameEn}`;
  // We don't have the original key; better to get from the already built candidate.
  // Since we already read the votes.txt during building, we need to store the initial vote somewhere.
  // Let's re-read it from the votesFiles map using the candidate key.
  // But we lost the mapping from candidate.id to votes.txt content.
  // Simpler: while building, we stored the initial vote in a separate map.
}
// To avoid double reading, we can store initial votes in a separate variable during building.

// Let's rebuild a map from candidate ID to its initial vote count.
const initialVotesMap: Record<string, number> = {};
for (const [path, mod] of Object.entries(votesFiles)) {
  const key = getCandidateKey(path);
  const candidate = builtCandidates.find(c => {
    const candidateKey = `${c.gender === 'male' ? 'Male' : 'Female'}/${c.nameEn}`;
    return candidateKey === key;
  });
  if (candidate) {
    const vote = parseInt((mod as string).trim(), 10);
    if (!isNaN(vote)) initialVotesMap[candidate.id] = vote;
  }
}
// For any candidate without votes.txt, default to 0
for (const c of builtCandidates) {
  if (!(c.id in initialVotesMap)) initialVotesMap[c.id] = 0;
}

// Function to get current votes (merged with localStorage)
function getVotesMap(): Record<string, number> {
  const stored = localStorage.getItem(VOTES_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Merge with initial votes in case new candidates were added
    const merged = { ...initialVotesMap };
    for (const [id, count] of Object.entries(parsed)) {
      if (id in merged) merged[id] = count;
    }
    return merged;
  }
  // No stored votes: use initial votes and persist them
  localStorage.setItem(VOTES_KEY, JSON.stringify(initialVotesMap));
  return { ...initialVotesMap };
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
