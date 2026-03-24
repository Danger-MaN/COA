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

export function CandidateCard({ candidate, lang, rank, votesLabel, votedLabel, onSelect }: CandidateCardProps) {
  // القيمة هنا ستكون مدمجة (ملف + سيرفر) لأننا سنمررها من الصفحة الأب
  const currentVotes = candidate.votes || 0; 
  const votedForThis = getVotedCandidateId(candidate.gender) === candidate.id;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 hover:shadow-xl active:scale-[0.98]"
      onClick={() => onSelect(candidate.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm text-sm font-bold text-gold border border-gold/20">
          {rank + 1}
        </div>
        {votedForThis && (
          <div className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold/90 text-primary-foreground shadow-lg">
            <Check className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold truncate">{candidate.name}</h3>
        <p className="text-sm text-muted-foreground">{currentVotes} {votesLabel}</p>
      </div>
    </div>
  );
}
