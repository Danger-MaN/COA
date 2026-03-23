// ── Male ── Yousef Al-Athari
import m1_main from '@/assets/candidates/Male/YousefAlAthari/main.jpg';
import m1_g1 from '@/assets/candidates/Male/YousefAlAthari/gallery/1.jpg';
import m1_g2 from '@/assets/candidates/Male/YousefAlAthari/gallery/2.jpg';
import m1_bioAr from '@/assets/candidates/Male/YousefAlAthari/bio_ar.txt?raw';
import m1_bioEn from '@/assets/candidates/Male/YousefAlAthari/bio_en.txt?raw';
// ── Male ── Khaled Al-Nili
import m2_main from '@/assets/candidates/Male/KhaledAlNili/main.jpg';
import m2_g1 from '@/assets/candidates/Male/KhaledAlNili/gallery/1.jpg';
import m2_g2 from '@/assets/candidates/Male/KhaledAlNili/gallery/2.jpg';
import m2_bioAr from '@/assets/candidates/Male/KhaledAlNili/bio_ar.txt?raw';
import m2_bioEn from '@/assets/candidates/Male/KhaledAlNili/bio_en.txt?raw';
// ── Male ── Omar Al-Rukhami
import m3_main from '@/assets/candidates/Male/OmarAlRukhami/main.jpg';
import m3_g1 from '@/assets/candidates/Male/OmarAlRukhami/gallery/1.jpg';
import m3_g2 from '@/assets/candidates/Male/OmarAlRukhami/gallery/2.jpg';
import m3_bioAr from '@/assets/candidates/Male/OmarAlRukhami/bio_ar.txt?raw';
import m3_bioEn from '@/assets/candidates/Male/OmarAlRukhami/bio_en.txt?raw';
// ── Female ── Modern Nefertiti
import f1_main from '@/assets/candidates/Female/ModernNefertiti/main.jpg';
import f1_g1 from '@/assets/candidates/Female/ModernNefertiti/gallery/1.jpg';
import f1_g2 from '@/assets/candidates/Female/ModernNefertiti/gallery/2.jpg';
import f1_bioAr from '@/assets/candidates/Female/ModernNefertiti/bio_ar.txt?raw';
import f1_bioEn from '@/assets/candidates/Female/ModernNefertiti/bio_en.txt?raw';
// ── Female ── Modern Cleopatra
import f2_main from '@/assets/candidates/Female/ModernCleopatra/main.jpg';
import f2_g1 from '@/assets/candidates/Female/ModernCleopatra/gallery/1.jpg';
import f2_g2 from '@/assets/candidates/Female/ModernCleopatra/gallery/2.jpg';
import f2_bioAr from '@/assets/candidates/Female/ModernCleopatra/bio_ar.txt?raw';
import f2_bioEn from '@/assets/candidates/Female/ModernCleopatra/bio_en.txt?raw';
// ── Female ── Helen of the East
import f3_main from '@/assets/candidates/Female/HelenOfTheEast/main.jpg';
import f3_g1 from '@/assets/candidates/Female/HelenOfTheEast/gallery/1.jpg';
import f3_g2 from '@/assets/candidates/Female/HelenOfTheEast/gallery/2.jpg';
import f3_bioAr from '@/assets/candidates/Female/HelenOfTheEast/bio_ar.txt?raw';
import f3_bioEn from '@/assets/candidates/Female/HelenOfTheEast/bio_en.txt?raw';

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

const INITIAL_VOTES: Record<string, number> = {
  'm1': 142, 'm2': 98, 'm3': 215,
  'f1': 187, 'f2': 256, 'f3': 134,
};

export const candidates: Candidate[] = [
  { id: 'm1', nameAr: 'يوسف الأثري', nameEn: 'Youssef Al-Athari', bioAr: m1_bioAr, bioEn: m1_bioEn, gender: 'male', image: m1_main, gallery: [m1_main, m1_g1, m1_g2], facebook: 'https://facebook.com', instagram: 'https://instagram.com' },
  { id: 'm2', nameAr: 'خالد النيلي', nameEn: 'Khaled Al-Nili', bioAr: m2_bioAr, bioEn: m2_bioEn, gender: 'male', image: m2_main, gallery: [m2_main, m2_g1, m2_g2], twitter: 'https://twitter.com', instagram: 'https://instagram.com' },
  { id: 'm3', nameAr: 'عمر الرخامي', nameEn: 'Omar Al-Rukhami', bioAr: m3_bioAr, bioEn: m3_bioEn, gender: 'male', image: m3_main, gallery: [m3_main, m3_g1, m3_g2], facebook: 'https://facebook.com', twitter: 'https://twitter.com', instagram: 'https://instagram.com' },
  { id: 'f1', nameAr: 'نفرتيتي الحديثة', nameEn: 'Modern Nefertiti', bioAr: f1_bioAr, bioEn: f1_bioEn, gender: 'female', image: f1_main, gallery: [f1_main, f1_g1, f1_g2], instagram: 'https://instagram.com' },
  { id: 'f2', nameAr: 'كليوباترا العصرية', nameEn: 'Modern Cleopatra', bioAr: f2_bioAr, bioEn: f2_bioEn, gender: 'female', image: f2_main, gallery: [f2_main, f2_g1, f2_g2], facebook: 'https://facebook.com', twitter: 'https://twitter.com', instagram: 'https://instagram.com' },
  { id: 'f3', nameAr: 'هيلين الشرق', nameEn: 'Helen of the East', bioAr: f3_bioAr, bioEn: f3_bioEn, gender: 'female', image: f3_main, gallery: [f3_main, f3_g1, f3_g2], facebook: 'https://facebook.com', instagram: 'https://instagram.com' },
];

const VOTES_KEY = 'taj_votes';
const VOTED_KEY = 'taj_voted';
const VOTED_CANDIDATE_KEY = 'taj_voted_candidate';

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
