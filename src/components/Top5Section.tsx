import { Candidate } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Crown } from 'lucide-react';

interface Top5Props {
  title: string;
  genderLabel: string;
  candidates: Candidate[];
  lang: Lang;
  votesLabel: string;
  onSelect: (id: string) => void;
}

export function Top5Section({ title, genderLabel, candidates, lang, votesLabel, onSelect }: Top5Props) {
  return (
    <div className="mb-2">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg font-semibold text-gold">{title} — {genderLabel}</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {candidates.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="group relative flex-shrink-0 w-40 overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all hover:border-gold/30 active:scale-[0.97]"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background/80 text-xs font-bold text-gold border border-gold/20">
                {i + 1}
              </div>
            </div>
            <div className="p-3 text-start">
              <p className="text-sm font-semibold truncate mb-1">{c.name}</p>
              <p className="text-xs text-gold font-medium">{c.votes || 0} {votesLabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
