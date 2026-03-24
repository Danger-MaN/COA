import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, getVotes, hasVoted, castVote, undoVote, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
// استيراد دوال الربط مع السيرفر من ملف data.ts
import { fetchLiveVotes, updateLiveVote } from '@/lib/data'; 

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
  onVoteChange: () => void;
}

export function CandidateProfile({ 
  candidate, lang, rank, onBack, voteLabel, votedLabel, votesLabel, 
  backLabel, galleryLabel, rankLabel, alreadyVotedMsg, undoLabel, 
  bioLabel, onVoteChange 
}: ProfileProps) {
  
  // تعريف الحالات (States)
  const [votes, setVotes] = useState(() => getVotes(candidate.id));
  const [hasVotedGender, setHasVotedGender] = useState(() => hasVoted(candidate.gender));
  const [votedForThis, setVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);
  
  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // تأثير لجلب الأصوات الحية فور تحميل الصفحة لضمان المصداقية
  useEffect(() => {
    async function loadVotes() {
      try {
        const liveVotes = await fetchLiveVotes(candidate.id);
        const staticVotes = getVotes(candidate.id);
        setVotes(staticVotes + liveVotes);
      } catch (error) {
        console.error("Error loading live votes:", error);
      }
    }
    loadVotes();
  }, [candidate.id]);

  // دالة التصويت (زيادة صوت)
  const handleVote = async () => {
    if (hasVotedGender) {
      toast.error(alreadyVotedMsg);
      return;
    }

    try {
      // 1. تحديث السيرفر أولاً
      await updateLiveVote(candidate.id, 'vote');
      
      // 2. تحديث التخزين المحلي
      const success = castVote(candidate.id, candidate.gender);
      
      if (success) {
        // 3. إعادة جلب المجموع النهائي للتأكد
        const latestLive = await fetchLiveVotes(candidate.id);
        setVotes(getVotes(candidate.id) + latestLive);
        
        setHasVotedGender(true);
        setVotedForThis(true);
        onVoteChange();
        toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
      }
    } catch (error) {
      toast.error(lang === 'ar' ? "حدث خطأ في الاتصال" : "Connection error");
    }
  };

  // دالة إلغاء التصويت (نقصان صوت)
  const handleUndo = async () => {
    try {
      // 1. تحديث السيرفر بالخصم
      await updateLiveVote(candidate.id, 'undo');

      // 2. تحديث التخزين المحلي
      const success = undoVote(candidate.gender);
      
      if (success) {
        // 3. إعادة جلب المجموع النهائي
        const latestLive = await fetchLiveVotes(candidate.id);
        setVotes(getVotes(candidate.id) + latestLive);
        
        setHasVotedGender(false);
        setVotedForThis(false);
        onVoteChange();
        toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
      }
    } catch (error) {
      toast.error(lang === 'ar' ? "حدث خطأ أثناء الإلغاء" : "Error during undo");
    }
  };

  const socials = [
    { icon: Facebook, url: candidate.facebook, label: 'Facebook' },
    { icon: Twitter, url: candidate.twitter, label: 'Twitter' },
    { icon: Instagram, url: candidate.instagram, label: 'Instagram' },
  ].filter(s => s.url);

  return (
    <div className="container max-w-5xl py-8 animate-fade-up">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]">
        <BackArrow className="h-4 w-4" />
        <span>{backLabel}</span>
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* قسم الصور */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gold/10 shadow-xl">
            <img
              src={candidate.gallery[selectedImg] || candidate.image}
              alt={name}
              className="w-full object-cover object-center transition-all duration-500"
              style={{ aspectRatio: 'auto', maxHeight: '600px' }}
            />
          </div>
          {candidate.gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {candidate.gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 active:scale-[0.95] ${
                    selectedImg === i ? 'border-gold shadow-lg shadow-gold/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${name} ${i + 1}`} className="h-20 w-20 object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* قسم المعلومات */}
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 text-sm font-bold text-gold">{rank + 1}</span>
            <span className="text-sm text-muted-foreground">{rankLabel} #{rank + 1}</span>
          </div>
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl" style={{ lineHeight: '1.1' }}>{name}</h2>

          {candidate.bio?.trim() && (
            <div className="mt-5 rounded-xl border border-gold/10 bg-gold/5 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">{bioLabel}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{candidate.bio}</p>
            </div>
          )}

          <p className="mt-4 text-xl text-gold font-display">{votes} {votesLabel}</p>

          <div className="mt-8 flex gap-3">
            {votedForThis ? (
              <button
                onClick={handleUndo}
                className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-8 py-3.5 font-display text-base font-semibold text-destructive transition-all duration-200 hover:bg-destructive/20 active:scale-[0.97]"
              >
                <Undo2 className="h-5 w-5" />
                {undoLabel}
              </button>
            ) : (
              <button
                onClick={handleVote}
                disabled={hasVotedGender}
                className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-display text-base font-semibold transition-all duration-200 active:scale-[0.97] ${
                  hasVotedGender
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'gold-gradient text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-gold/20'
                }`}
              >
                <Heart className={`h-5 w-5 ${hasVotedGender ? '' : 'fill-current'}`} />
                {hasVotedGender ? votedLabel : voteLabel}
              </button>
            )}
          </div>

          {socials.length > 0 && (
            <div className="mt-8 flex gap-3">
              {socials.map(({ icon: Icon, url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 text-muted-foreground transition-all duration-300 hover:border-gold hover:text-gold hover:bg-gold/5 active:scale-[0.95]"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
