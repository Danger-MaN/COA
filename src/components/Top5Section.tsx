import { useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-2">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg font-semibold text-gold">{title} — {genderLabel}</h3>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {candidates.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="group relative flex-shrink-0 w-40 overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 hover:shadow-xl active:scale-[0.97]"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img src={c.image} alt={c.name} className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm text-xs font-bold text-gold shadow border border-gold/20">
                {i + 1}
              </div>
            </div>
            <div className="p-3 text-start">
              <p className="text-sm font-semibold truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.votes ?? 0} {votesLabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
