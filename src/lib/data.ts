// data.ts
import type { Candidate, Gender } from './types'; // adjust path as needed

// ------------------------------------------------------------------
// 1. Define base path for candidates assets (relative to project root)
// ------------------------------------------------------------------
const basePath = '/src/assets/candidates';

// ------------------------------------------------------------------
// 2. Use Vite glob imports to collect all files of each type
// ------------------------------------------------------------------

// Main image: any file named "main.*" inside candidate folder
const mainImages = import.meta.glob<{ default: string }>(
  `${basePath}/*/*/main.*`,
  { eager: true }
);

// Gallery images: any file inside Gallery subfolder (any extension)
const galleryImages = import.meta.glob<{ default: string }>(
  `${basePath}/*/*/Gallery/*.*`,
  { eager: true }
);

// Text files: we'll store them as raw strings
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

// ------------------------------------------------------------------
// 3. Helper to extract candidate identifier from a file path
//    Example: "/src/assets/candidates/Male/Ahmed Wael/main.jpg"
//    -> "Male/Ahmed Wael"
// ------------------------------------------------------------------
function getCandidateKey(filePath: string): string {
  const parts = filePath.split('/');
  // Find the segment that is either "Male" or "Female"
  const genderIndex = parts.findIndex(p => p === 'Male' || p === 'Female');
  if (genderIndex === -1) {
    throw new Error(`Cannot determine gender from path: ${filePath}`);
  }
  const folderName = parts[genderIndex + 1];
  if (!folderName) {
    throw new Error(`Missing folder name in path: ${filePath}`);
  }
  return `${parts[genderIndex]}/${folderName}`;
}

// ------------------------------------------------------------------
// 4. Build maps: candidate key -> data
// ------------------------------------------------------------------

// Map candidate key -> main image URL
const mainMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(mainImages)) {
  const key = getCandidateKey(path);
  mainMap[key] = (mod as { default: string }).default;
}

// Map candidate key -> gallery image URLs (sorted naturally)
const galleryMap: Record<string, string[]> = {};
for (const [path, mod] of Object.entries(galleryImages)) {
  const key = getCandidateKey(path);
  if (!galleryMap[key]) galleryMap[key] = [];
  galleryMap[key].push((mod as { default: string }).default);
}
// Sort each gallery array for consistent order
for (const key in galleryMap) {
  galleryMap[key].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Map candidate key -> raw text content (optional)
const bioMap: Record<string, string> = {};
for (const [path, content] of Object.entries(bioFiles)) {
  bioMap[getCandidateKey(path)] = content;
}
const votesMap: Record<string, number> = {};
for (const [path, content] of Object.entries(votesFiles)) {
  const val = parseInt(content.trim(), 10);
  if (!isNaN(val)) votesMap[getCandidateKey(path)] = val;
}
const instagramMap: Record<string, string> = {};
for (const [path, content] of Object.entries(instagramFiles)) {
  instagramMap[getCandidateKey(path)] = content.trim();
}
const facebookMap: Record<string, string> = {};
for (const [path, content] of Object.entries(facebookFiles)) {
  facebookMap[getCandidateKey(path)] = content.trim();
}
const twitterMap: Record<string, string> = {};
for (const [path, content] of Object.entries(twitterFiles)) {
  twitterMap[getCandidateKey(path)] = content.trim();
}
const nameArMap: Record<string, string> = {};
for (const [path, content] of Object.entries(nameArFiles)) {
  nameArMap[getCandidateKey(path)] = content.trim();
}
const nameEnMap: Record<string, string> = {};
for (const [path, content] of Object.entries(nameEnFiles)) {
  nameEnMap[getCandidateKey(path)] = content.trim();
}

// ------------------------------------------------------------------
// 5. Build the candidates array dynamically
// ------------------------------------------------------------------
const builtCandidates: Candidate[] = [];

// All candidate keys are derived from main images (ensures every candidate has a main image)
for (const key of Object.keys(mainMap)) {
  const [genderStr, folderName] = key.split('/');
  const gender = genderStr.toLowerCase() as Gender;

  // Generate an id: gender + '_' + folder name slugified
  const id = `${gender}_${folderName.replace(/\s+/g, '_')}`;

  // Names: use provided text files or fallback to folder name
  const nameAr = nameArMap[key] || folderName;
  const nameEn = nameEnMap[key] || folderName;

  // Bio: use the same bio.txt for both languages (assumed to be in Arabic)
  const bio = bioMap[key] || '';
  const bioAr = bio;
  const bioEn = bio; // you can later separate if needed

  // Social links (may be undefined)
  const instagram = instagramMap[key];
  const facebook = facebookMap[key];
  const twitter = twitterMap[key];

  // Main image URL
  const image = mainMap[key];

  // Gallery: include main image first, then gallery images
  const gallery = [image, ...(galleryMap[key] || [])];

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

// ------------------------------------------------------------------
// 6. Prepare initial votes from votes.txt
// ------------------------------------------------------------------
const INITIAL_VOTES: Record<string, number> = {};
for (const candidate of builtCandidates) {
  // We need to map candidate.id back to the votesMap key.
  // The key is e.g. "Male/Ahmed Wael". We can reconstruct it from the candidate data.
  const folderName = candidate.nameEn; // This assumes folder name equals English name (or we need to store original folder)
  // But that may not be accurate. Better to store the original folder name during building.
  // Instead, we can create a mapping from candidate.id to key during building.
}
// To avoid complexity, we can store the initial vote directly when building the candidate.
// Let's modify the building loop to capture initialVotes.

// We'll rebuild with initialVotes stored.
const candidatesWithInitialVotes: Candidate[] = [];
const initialVotesForId: Record<string, number> = {};

for (const key of Object.keys(mainMap)) {
  const [genderStr, folderName] = key.split('/');
  const gender = genderStr.toLowerCase() as Gender;
  const id = `${gender}_${folderName.replace(/\s+/g, '_')}`;

  const nameAr = nameArMap[key] || folderName;
  const nameEn = nameEnMap[key] || folderName;
  const bio = bioMap[key] || '';
  const bioAr = bio;
  const bioEn = bio;
  const instagram = instagramMap[key];
  const facebook = facebookMap[key];
  const twitter = twitterMap[key];
  const image = mainMap[key];
  const gallery = [image, ...(galleryMap[key] || [])];

  // Initial votes
  const initVote = votesMap[key] || 0;
  initialVotesForId[id] = initVote;

  candidatesWithInitialVotes.push({
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

export const candidates: Candidate[] = candidatesWithInitialVotes;

// ------------------------------------------------------------------
// 7. Vote storage and helpers (same logic, but using dynamic initial votes)
// ------------------------------------------------------------------
const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

function getVotesMap(): Record<string, number> {
  const stored = localStorage.getItem(VOTES_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Merge with initial votes (in case new candidates were added)
    const merged = { ...initialVotesForId };
    for (const [id, count] of Object.entries(parsed)) {
      if (id in merged) merged[id] = count;
    }
    return merged;
  }
  // No stored votes: use initial votes and persist them
  localStorage.setItem(VOTES_KEY, JSON.stringify(initialVotesForId));
  return { ...initialVotesForId };
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
