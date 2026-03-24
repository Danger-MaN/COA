import { Candidate, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Heart, Check } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  lang: Lang;
  rank: number; // الترتيب في القائمة المعروضة (يُستخدم لعرض الرقم)
  votesLabel: string;
  votedLabel: string;
  onSelect: (id: string, rank: number) => void; // تغيير
}

export function CandidateCard({ candidate, lang, rank, votesLabel, votedLabel, onSelect }: CandidateCardProps) {
  const votedForThis = getVotedCandidateId(candidate.gender) === candidate.id;
  const name = candidate.name;

  return (
    <div
      className="group cursor-pointer ..."
      style={{ animationDelay: `${rank * 80}ms` }}
      onClick={() => onSelect(candidate.id, rank + 1)} // نمرر الترتيب الحقيقي (يبدأ من 1)
    >
      {/* باقي المحتوى */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img src={candidate.image} alt={name} ... />
        <div className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center ...">
          {rank + 1}
        </div>
        {votedForThis && <div className="absolute top-3 end-3 ..."><Check className="h-5 w-5" /></div>}
        <div className="absolute inset-x-0 bottom-0 ...">...</div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-semibold truncate">{name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{candidate.votes ?? 0} {votesLabel}</p>
          {votedForThis && <span className="text-xs font-semibold text-gold">{votedLabel} ✓</span>}
        </div>
      </div>
    </div>
  );
}
