import { Candidate, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { Heart, Check } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  lang: Lang;
  rank: number;
  votesLabel: string;
  votedLabel: string; // مضافة للتوافق مع استدعاءات الصفحات
  onSelect: (id: string) => void;
}

export function CandidateCard({ 
  candidate, 
  lang, 
  rank, 
  votesLabel, 
  onSelect 
}: CandidateCardProps) {
  
  // نعتمد على الأصوات الممررة داخل كائن المتسابق نفسه لضمان التزامن مع السيرفر
  const currentVotes = candidate.votes || 0;
  const votedForThis = getVotedCandidateId(candidate.gender) === candidate.id;
  const name = candidate.name;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gold/10 bg-card shadow-lg transition-all duration-500 hover:border-gold/30 hover:shadow-xl hover:shadow-gold/5 active:scale-[0.98]"
      style={{ 
        animation: 'fade-in-up 0.5s ease-out forwards',
        animationDelay: `${rank * 80}ms`,
        opacity: 0 
      }}
      onClick={() => onSelect(candidate.id)}
    >
      {/* قسم الصورة مع الطبقات فوقها */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={candidate.image}
          alt={name}
          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* رتبة المتسابق (Badge) */}
        <div className="absolute top-3 start-3 flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 backdrop-blur-md text-sm font-bold text-gold shadow-lg border border-gold/20 z-10">
          {rank + 1}
        </div>

        {/* علامة "تم التصويت" */}
        {votedForThis && (
          <div className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-primary-foreground shadow-lg z-10 animate-in zoom-in duration-300">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
        )}

        {/* تأثير التدرج السفلي وزر "عرض الملف" عند التحويم */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end justify-center p-6">
          <span className="flex items-center gap-2 rounded-xl gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xl transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
            <Heart className="h-4 w-4 fill-current" />
            {lang === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
          </span>
        </div>
      </div>

      {/* تفاصيل المتسابق */}
      <div className="p-4 bg-card">
        <h3 className="font-display text-base font-bold truncate text-foreground group-hover:text-gold transition-colors">
          {name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gold/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {currentVotes.toLocaleString()} <span className="text-xs opacity-80">{votesLabel}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
