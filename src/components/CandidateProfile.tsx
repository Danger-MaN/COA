import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, fetchLiveVotes, castVote, undoVote, getVotedCandidateId, hasVoted, updateLiveVote, getVotes } from '@/lib/data';
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
  onVoteChange: () => void;
}

export function CandidateProfile({ candidate, lang, rank, onBack, voteLabel, votedLabel, votesLabel, backLabel, galleryLabel, rankLabel, alreadyVotedMsg, undoLabel, bioLabel, onVoteChange }: ProfileProps) {
  // المجموع = الثابت (ملف) + الحي (سيرفر)
  const [liveVotes, setLiveVotes] = useState(0);
  const [hasVotedGender, setHasVotedGender] = useState(() => hasVoted(candidate.gender));
  const [votedForThis, setVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const staticVotes = getVotes(candidate.id);

  // جلب أصوات السيرفر فور تحميل الصفحة
  useEffect(() => {
    fetchLiveVotes(candidate.id).then(setLiveVotes);
  }, [candidate.id]);

  const handleVote = async () => {
    if (hasVotedGender) {
      toast.error(alreadyVotedMsg);
      return;
    }
    
    setIsSyncing(true);
    // 1. التحديث محلياً (LocalStorage)
    const localSuccess = castVote(candidate.id, candidate.gender);
    
    if (localSuccess) {
      // 2. التحديث في السيرفر (Netlify Blobs)
      const newServerTotal = await updateLiveVote(candidate.id, 'vote');
      setLiveVotes(newServerTotal);
      setHasVotedGender(true);
      setVotedForThis(true);
      onVoteChange();
      toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
    }
    setIsSyncing(false);
  };

  const handleUndo = async () => {
    setIsSyncing(true);
    const localSuccess = undoVote(candidate.gender);
    if (localSuccess) {
      const newServerTotal = await updateLiveVote(candidate.id, 'undo');
      setLiveVotes(newServerTotal);
      setHasVotedGender(false);
      setVotedForThis(false);
      onVoteChange();
      toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
    }
    setIsSyncing(false);
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
        {/* Images القسم كما هو */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gold/10 shadow-xl">
            <img src={candidate.gallery[selectedImg] || candidate.image} alt={name} className="w-full object-cover object-center" style={{ maxHeight: '600px' }} />
          </div>
        </div>

        {/* Info القسم المعدل */}
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 text-sm font-bold text-gold">{rank + 1}</span>
            <span className="text-sm text-muted-foreground">{rankLabel} #{rank + 1}</span>
          </div>
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">{name}</h2>

          {/* عرض المجموع الكلي (ثابت + حي) */}
          <p className="mt-4 text-xl text-gold font-display">
            {staticVotes + liveVotes} {votesLabel}
          </p>

          <div className="mt-8 flex gap-3">
            {votedForThis ? (
              <button onClick={handleUndo} disabled={isSyncing} className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-8 py-3.5 font-semibold text-destructive transition-all">
                <Undo2 className="h-5 w-5" /> {undoLabel}
              </button>
            ) : (
              <button onClick={handleVote} disabled={hasVotedGender || isSyncing} className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-semibold transition-all ${hasVotedGender ? 'bg-muted text-muted-foreground' : 'gold-gradient text-primary-foreground shadow-lg'}`}>
                <Heart className={`h-5 w-5 ${hasVotedGender ? '' : 'fill-current'}`} />
                {hasVotedGender ? votedLabel : voteLabel}
              </button>
            )}
          </div>
          {/* Socials ... */}
        </div>
      </div>
    </div>
  );
}
