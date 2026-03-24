import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, getVotes, hasVoted, castVote, undoVote, getVotedCandidateId } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { useState, useEffect } from 'react'; // التأكد من وجود useEffect
import { toast } from 'sonner';
// استيراد الدوال اللازمة للربط مع السيرفر
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
  
  const [votes, setVotes] = useState(() => getVotes(candidate.id));
  const [hasVotedGender, setHasVotedGender] = useState(() => hasVoted(candidate.gender));
  const [votedForThis, setVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);
  
  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // إصلاح: جلب الأصوات الحية وتحديث العداد فور تحميل الصفحة
  useEffect(() => {
    const loadVotes = async () => {
      const liveVotes = await fetchLiveVotes(candidate.id);
      const staticVotes = getVotes(candidate.id);
      setVotes(staticVotes + liveVotes);
    };
    loadVotes();
  }, [candidate.id]);

  const handleVote = async () => {
    if (hasVotedGender) {
      toast.error(alreadyVotedMsg);
      return;
    }

    try {
      await updateLiveVote(candidate.id, 'vote');
      const success = castVote(candidate.id, candidate.gender);
      
      if (success) {
        const latestLive = await fetchLiveVotes(candidate.id);
        setVotes(getVotes(candidate.id) + latestLive);
        setHasVotedGender(true);
        setVotedForThis(true);
        onVoteChange(); // تحديث الصفحة الأب (CandidatePage)
        toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
      }
    } catch (error) {
      toast.error("Error connecting to voting server");
    }
  };

  const handleUndo = async () => {
    try {
      await updateLiveVote(candidate.id, 'undo');
      const success = undoVote(candidate.gender);
      
      if (success) {
        const latestLive = await fetchLiveVotes(candidate.id);
        setVotes(getVotes(candidate.id) + latestLive);
        setHasVotedGender(false);
        setVotedForThis(false);
        onVoteChange();
        toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
      }
    } catch (error) {
      toast.error("Error connecting to voting server");
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
        {/* قسم الصور الرئيسي */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gold/10 shadow-xl bg-card">
            <img
              src={candidate.gallery[selectedImg] || candidate.image}
              alt={name}
              className="w-full object-cover object-center transition-all duration-500"
              style={{ aspectRatio: '3/4', maxHeight: '600px' }}
            />
          </div>
          
          {/* المصغرات (Thumbnails) أسفل الصورة الكبيرة */}
          {candidate.gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {candidate.gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 active:scale-[0.95] ${
                    selectedImg === i ? 'border-gold shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${name} ${i + 1}`} className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* قسم التفاصيل */}
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 text-sm font-bold text-gold">{rank + 1}</span>
            <span className="text-sm text-muted-foreground">{rankLabel} #{rank + 1}</span>
          </div>
          
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">{name}</h2>

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
                    : 'gold-gradient text-primary-foreground shadow-lg hover:shadow-xl'
                }`}
              >
                <Heart className={`h-5 w-5 ${hasVotedGender ? '' : 'fill-current'}`} />
                {hasVotedGender ? votedLabel : voteLabel}
              </button>
            )}
          </div>

          {/* الروابط الاجتماعية */}
          {socials.length > 0 && (
            <div className="mt-8 flex gap-3">
              {socials.map(({ icon: Icon, url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 text-muted-foreground transition-all duration-300 hover:border-gold hover:text-gold hover:bg-gold/5"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* معرض الصور الكامل (Grid) في الأسفل */}
      {candidate.gallery.length > 1 && (
        <div className="mt-12">
          <h3 className="mb-6 font-display text-xl font-semibold">{galleryLabel}</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {candidate.gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => { setSelectedImg(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="overflow-hidden rounded-2xl border border-gold/10 shadow-lg transition-all duration-300 hover:border-gold/30 active:scale-[0.98]"
              >
                <img src={img} alt={`${name} gallery ${i}`} className="w-full object-cover" style={{ aspectRatio: '3/4' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
