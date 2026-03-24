import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, castVote, undoVote, getVotedCandidateId, hasVoted } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ProfileProps {
  candidate: Candidate;
  lang: Lang;
  rank: number;
  onBack: () => void;
  voteLabel: string;
  votedLabel: string;
  votesLabel: string;
  backLabel: string;
  galleryLabel: string;
  rankLabel: string;
  alreadyVotedMsg: string;
  undoLabel: string;
  bioLabel: string;
  onVoteChange: () => void; // دالة لتحديث البيانات في الصفحة الأب (Parent)
}

export function CandidateProfile({ 
  candidate, lang, rank, onBack, voteLabel, votedLabel, 
  votesLabel, backLabel, galleryLabel, rankLabel, 
  alreadyVotedMsg, undoLabel, bioLabel, onVoteChange 
}: ProfileProps) {
  
  // 1. استخدام State محلي يتحدث فورياً عند التفاعل (Optimistic Update)
  const [votes, setVotes] = useState(candidate.votes || 0);
  const [isVotedForThis, setIsVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);

  // 2. مزامنة الحالة مع البيانات القادمة من السيرفر عند تغيير المتسابق
  useEffect(() => {
    setVotes(candidate.votes || 0);
    setIsVotedForThis(getVotedCandidateId(candidate.gender) === candidate.id);
  }, [candidate]);

  // 3. دالة التصويت (تعتمد على السيرفر)
  const handleVote = async () => {
    if (hasVoted(candidate.gender)) {
      toast.error(alreadyVotedMsg);
      return;
    }

    // تحديث واجهة المستخدم فوراً ليشعر المستخدم بالسرعة (Optimistic UI)
    setVotes(prev => prev + 1);
    setIsVotedForThis(true);

    const success = await castVote(candidate.id, candidate.gender);
    
    if (success) {
      toast.success(votedLabel);
      onVoteChange(); // إبلاغ الصفحة الرئيسية بضرورة إعادة جلب البيانات لترتيب المتسابقين
    } else {
      // إذا فشل الاتصال بالسيرفر، نتراجع عن الزيادة الوهمية
      setVotes(prev => prev - 1);
      setIsVotedForThis(false);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء التصويت' : 'Error casting vote');
    }
  };

  // 4. دالة التراجع عن التصويت (تعتمد على السيرفر)
  const handleUndo = async () => {
    // تحديث واجهة المستخدم فوراً ليشعر المستخدم بالسرعة (Optimistic UI)
    setVotes(prev => Math.max(0, prev - 1));
    setIsVotedForThis(false);

    const success = await undoVote(candidate.id, candidate.gender);
    
    if (success) {
      toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
      onVoteChange();
    } else {
      // تراجع عن التغيير في حالة الفشل
      setVotes(prev => prev + 1);
      setIsVotedForThis(true);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إلغاء التصويت' : 'Error undoing vote');
    }
  };

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // إعدادات معرض الصور
  const galleryImages = candidate.gallery && candidate.gallery.length > 0 
    ? candidate.gallery 
    : [candidate.image]; // استخدام الصورة الرئيسية إذا لم تكن هناك صور في المعرض

  return (
    <div className="container py-8">
      {/* زر العودة */}
      <button onClick={onBack} className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
        <BackArrow className="h-5 w-5" />
        <span className="font-medium">{backLabel}</span>
      </button>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* قسم الصورة الرئيسية والمعرض */}
        <div className="space-y-6">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-gold/20 shadow-2xl animate-in fade-in duration-700">
            <img 
              src={galleryImages[selectedImg]} 
              alt={name} 
              className="h-full w-full object-cover object-center transition-all duration-500" 
            />
          </div>
          
          {/* معرض الصور المصغرة (Gallery Thumbnails) */}
          {galleryImages.length > 1 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">{galleryLabel}</h4>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {galleryImages.map((img, index) => (
                  <button 
                    key={index} 
                    onClick={() => setSelectedImg(index)}
                    className={`relative w-20 aspect-[3/4] flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImg === index ? 'border-gold shadow-lg ring-2 ring-gold/20' : 'border-gold/10 hover:border-gold/30'}`}
                  >
                    <img src={img} alt={`${name} gallery ${index + 1}`} className="h-full w-full object-cover object-center" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* قسم البيانات والزر */}
        <div className="flex flex-col justify-center space-y-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full bg-gold/10 px-4 py-1 text-sm font-bold text-gold border border-gold/20">
                {rankLabel} #{rank + 1}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {votes.toLocaleString()} {votesLabel}
              </span>
            </div>
            <h2 className="font-display text-5xl font-bold leading-tight">{name}</h2>
          </div>

          <div className="rounded-2xl border border-gold/10 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="mb-3 font-display text-lg font-semibold text-gold">{bioLabel}</h3>
            <p className="text-lg leading-relaxed text-muted-foreground italic">"{candidate.bio[lang]}"</p>
          </div>

          {/* أزرار التفاعل المعتمدة على السيرفر */}
          <div className="flex flex-wrap gap-4">
            {isVotedForThis ? (
              <button 
                onClick={handleUndo} 
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl border-2 border-gold/50 bg-transparent py-4 font-display text-xl font-bold text-gold transition-all hover:bg-gold/5 active:scale-95"
              >
                <Undo2 className="h-6 w-6" />
                {undoLabel}
              </button>
            ) : (
              <button 
                onClick={handleVote} 
                className="gold-gradient flex flex-1 items-center justify-center gap-3 rounded-2xl py-4 font-display text-xl font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Heart className="h-6 w-6" />
                {voteLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
