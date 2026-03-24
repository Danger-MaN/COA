import { Candidate, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Heart, Check } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;   // يجب أن يحتوي candidate على votes المحدث (ثابت + حي)
  lang: Lang;
  rank: number;
  votesLabel: string;
  votedLabel: string;
  onSelect: (id: string) => void;
}

export function CandidateCard({ candidate, lang, rank, votesLabel, votedLabel, onSelect }: CandidateCardProps) {
  const votedForThis = getVotedCandidateId(candidate.gender) === candidate.id;
  const name = candidate.name;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 hover:shadow-xl hover:shadow-gold/5 active:scale-[0.98]"
      style={{ animationDelay: `${rank * 80}ms` }}
      onClick={() => onSelect(candidate.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={candidate.image}
          alt={name}
          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm text-sm font-bold text-gold shadow-lg border border-gold/20">
          {rank + 1}
        </div>
        {votedForThis && (
          <div className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold/90 text-primary-foreground shadow-lg">
            <Check className="h-5 w-5" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-background/90 via-background/60 to-transparent p-4 pt-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-xl gold-gradient px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md">
            <Heart className="h-4 w-4 fill-current" />
            {lang === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold truncate">{name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{candidate.votes ?? 0} {votesLabel}</p>
          {votedForThis && (
            <span className="text-xs font-semibold text-gold">{votedLabel} ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
