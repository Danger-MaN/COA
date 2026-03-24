import { Candidate, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Heart, Check } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  lang: Lang;
  rank: number;
  votesLabel: string;
  votedLabel: string;
  onSelect: (id: string) => void;
}

export function CandidateCard({ candidate, lang, rank, votesLabel, onSelect }: CandidateCardProps) {
  // نستخدم candidate.votes المحدثة والقادمة من getCandidatesLive
  const currentVotes = candidate.votes || 0; 
  const votedForThis = getVotedCandidateId(candidate.gender) === candidate.id;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 active:scale-[0.98]"
      onClick={() => onSelect(candidate.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 text-sm font-bold text-gold border border-gold/20">
          {rank + 1}
        </div>
        {votedForThis && (
          <div className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-primary-foreground">
            <Check className="h-5 w-5" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-background p-4 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-xl gold-gradient px-6 py-2 text-sm font-semibold text-primary-foreground">
            <Heart className="h-4 w-4 fill-current" />
            {lang === 'ar' ? 'عرض الملف' : 'View Profile'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold truncate">{candidate.name}</h3>
        <p className="text-sm text-muted-foreground">{currentVotes} {votesLabel}</p>
      </div>
    </div>
  );
}
