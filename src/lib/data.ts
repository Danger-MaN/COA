export type Gender = 'male' | 'female';

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  gender: Gender;
  image: string;
  gallery: string[];
  votes?: number; // مجموع الأصوات (ثابت + حي)
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

/* ── Static Votes Map (from votes.txt files) ── */
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

/* ── Live Data Fetching ── */

export async function fetchAllLiveVotes(): Promise<Record<string, number>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('/.netlify/functions/vote-api', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`fetchAllLiveVotes failed: ${response.status}`);
      return {};
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error in fetchAllLiveVotes:', err);
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

export interface VoteResult {
  success: boolean;
  votes?: number;
  error?: string;
  minutesLeft?: number;
  secondsLeft?: number;
}

// أضف هذه الدالة إلى data.ts
export interface VoteResult {
  success: boolean;
  votes?: number;
  error?: string;
  minutesLeft?: number;
  secondsLeft?: number;
  country?: string;
}

export async function updateLiveVote(candidateId: string, action: 'vote' | 'undo'): Promise<VoteResult> {
  try {
    const response = await fetch(`/.netlify/functions/vote-api?id=${encodeURIComponent(candidateId)}&action=${action}`, {
      method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error,
        minutesLeft: data.minutesLeft,
        secondsLeft: data.secondsLeft,
        country: data.country
      };
    }
    
    return { success: true, votes: data.votes };
  } catch {
    return { success: false, error: 'network_error' };
  }
}

// تحديث دالة getVoteErrorMessage
export function getVoteErrorMessage(error: string, lang: 'ar' | 'en', minutesLeft?: number, secondsLeft?: number, country?: string): string {
  if (error === 'country_not_allowed') {
    return lang === 'ar' 
      ? 'لا يمكنك التصويت في الوقت الحالي.'
      : 'You cannot vote at this time.';
  }
  if (error === 'ip_voted') {
    return lang === 'ar' 
      ? 'لا يمكنك التصويت أكثر من مرة من هذا الجهاز/الشبكة'
      : 'You cannot vote more than once from this device/network';
  }
  if (error === 'cooldown') {
    if (lang === 'ar') {
      return `لا يمكن التراجع إلا بعد ساعة. الوقت المتبقي: ${minutesLeft} دقيقة و ${secondsLeft} ثانية`;
    }
    return `You can only undo after one hour. Time remaining: ${minutesLeft} min ${secondsLeft} sec`;
  }
  if (error === 'no_vote_to_undo') {
    return lang === 'ar' ? 'لا يوجد تصويت لإلغائه' : 'No vote to undo';
  }
  if (error === 'wrong_candidate') {
    return lang === 'ar' ? 'لا يمكنك إلغاء تصويت لمرشح آخر' : 'Cannot undo vote for another candidate';
  }
  if (error === 'network_error') {
    return lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error';
  }
  return lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error';
}

/* ── Exported Functions (Synchronous) ── */
export function getVotes(candidateId: string): number {
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

/* ── Async Functions that combine static + live votes ── */
export async function getCandidatesLive(gender: Gender): Promise<Candidate[]> {
  const liveVotesMap = await fetchAllLiveVotes();
  
  return candidates
    .filter(c => c.gender === gender)
    .map(c => ({
      ...c,
      votes: (votesMap[c.id] || 0) + (liveVotesMap[c.id] || 0)
    }))
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

export async function getTop5Live(gender: Gender): Promise<Candidate[]> {
  const allSorted = await getCandidatesLive(gender);
  return allSorted.slice(0, 5);
}

/* ── Local Persistence (for UI state only) ── */

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
  return true;
}

// Legacy sync functions (optional)
export function getCandidatesSorted(gender: Gender): Candidate[] {
  return [...candidates]
    .filter(c => c.gender === gender)
    .sort((a, b) => (votesMap[b.id] || 0) - (votesMap[a.id] || 0));
}

export function getTop5(gender: Gender): Candidate[] {
  return getCandidatesSorted(gender).slice(0, 10);
}
