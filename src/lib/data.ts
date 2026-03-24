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

/* ── Vite glob imports ── */
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

/* ── Functions ── */
function parsePath(path: string): { gender: Gender; folderName: string } | null {
  const match = path.match(/\/src\/assets\/candidates\/(Male|Female)\/([^/]+)\//);
  if (!match) return null;
  return {
    gender: match[1].toLowerCase() as Gender,
    folderName: match[2],
  };
}

function readText(files: Record<string, string>, gender: string, name: string, file: string): string {
  // نقوم بالبحث عن المفتاح الذي ينتهي بـ /اسم_المجلد/اسم_الملف
  // هذا يتجنب مشاكل التشفير (Encoding) في الحروف العربية
  const targetSuffix = `/${gender}/${name}/${file}`;
  const key = Object.keys(files).find(k => k.endsWith(targetSuffix));
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

    const galleryPrefix = `/src/assets/candidates/${genderFolder}/${folderName}/gallery/`;
    const gallery = Object.entries(galleryImages)
      .filter(([p]) => p.startsWith(galleryPrefix))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, url]) => url);

    const mainImg = mainImages[path];
    
    results.push({
      id: `${info.gender[0]}-${encodeURIComponent(folderName)}`,
      // تحويل الشرطة لمسافة عند العرض فقط
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

// تصحيح مكان التصدير ليكون خارج الدالة
export const candidates: Candidate[] = buildCandidates();

/* ── Votes ── */
const votesMap = (() => {
  const originalFolderName = decodeURIComponent(c.id.slice(2));
  // نستخدم الاسم الأصلي (بما فيه من شرطات وعربي) للبحث في الملفات
  const raw = readText(voteFiles, genderFolder, originalFolderName, 'votes.txt');
  
  const result: Record<string, number> = {};
  for (const c of candidates) {
    const genderFolder = c.gender === 'male' ? 'Male' : 'Female';
    const originalFolderName = decodeURIComponent(c.id.slice(2));
    const raw = readText(voteFiles, genderFolder, originalFolderName, 'votes.txt');
    result[c.id] = parseInt(raw, 10) || 0;
  }
  return result;
})();

export function getVotes(candidateId: string): number {
  return votesMap[candidateId] || 0;
}

export function getAllVotes(): Record<string, number> {
  return { ...votesMap };
}

export function hasVoted(gender: Gender): boolean {
  const voted = localStorage.getItem('taj_voted');
  if (!voted) return false;
  const map = JSON.parse(voted);
  return !!map[gender];
}

export function getVotedCandidateId(gender: Gender): string | null {
  const stored = localStorage.getItem('taj_voted_candidate');
  if (!stored) return null;
  const map = JSON.parse(stored);
  return map[gender] || null;
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
  const candidateId = getVotedCandidateId(gender);
  if (!candidateId) return false;

  const votedMap = JSON.parse(localStorage.getItem('taj_voted') || '{}');
  delete votedMap[gender];
  localStorage.setItem('taj_voted', JSON.stringify(votedMap));

  const candidateMap = JSON.parse(localStorage.getItem('taj_voted_candidate') || '{}');
  delete candidateMap[gender];
  localStorage.setItem('taj_voted_candidate', JSON.stringify(candidateMap));

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
