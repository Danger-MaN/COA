import { useRef, useState, useEffect } from 'react';
import { Candidate, getVotes, fetchLiveVotes } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Crown } from 'lucide-react';

interface Top5Props {
  title: string;
  genderLabel: string;
  candidates: Candidate[];
  lang: Lang;
  votesLabel: string;
  onSelect: (id: string, rank: number) => void; // تغيير: نمرر rank أيضاً
}

export function Top5Section({ title, genderLabel, candidates, lang, votesLabel, onSelect }: Top5Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topCandidates, setTopCandidates] = useState<Candidate[]>(candidates);
  const [rankMap, setRankMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function loadLiveVotesAndSort() {
      try {
        const results = await Promise.all(
          candidates.map(async (c) => {
            const liveVotes = await fetchLiveVotes(c.id);
            const staticVotes = getVotes(c.id);
            return {
              ...c,
              votes: staticVotes + liveVotes
            };
          })
        );
        // الترتيب الكامل
        const sorted = results.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        // حفظ الترتيب لكل مرشح
        const newRankMap = new Map<string, number>();
        sorted.forEach((c, idx) => newRankMap.set(c.id, idx + 1));
        setRankMap(newRankMap);
        // أخذ أول 5 للعرض
        setTopCandidates(sorted.slice(0, 5));
      } catch (error) {
        console.error("Error loading live votes for Top5:", error);
      }
    }
    loadLiveVotesAndSort();
  }, [candidates]);

  return (
    <div className="mb-2">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg font-semibold text-gold">{title} — {genderLabel}</h3>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {topCandidates.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id, rankMap.get(c.id) || i + 1)}
            className="group relative flex-shrink-0 w-40 overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 hover:shadow-xl active:scale-[0.97]"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img src={c.image} alt={c.name} className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm text-xs font-bold text-gold shadow border border-gold/20">
                {rankMap.get(c.id) || i + 1}
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
