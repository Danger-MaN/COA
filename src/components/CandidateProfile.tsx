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
  onVoteChange: () => void;
}

export function CandidateProfile({ candidate, lang, rank, onBack, voteLabel, votedLabel, votesLabel, backLabel, galleryLabel, rankLabel, alreadyVotedMsg, undoLabel, bioLabel, onVoteChange }: ProfileProps) {
  // نعتمد على القيمة الأولية من الـ candidate (المجلوب حياً)
  const [votes, setVotes] = useState(candidate.votes || 0);
  const [isVotedForThis, setIsVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);

  // تحديث الحالة إذا تغير الـ candidate (مثلاً عند عمل Refresh)
  useEffect(() => {
    setVotes(candidate.votes || 0);
    setIsVotedForThis(getVotedCandidateId(candidate.gender) === candidate.id);
  }, [candidate]);

  const handleVote = async () => {
    if (hasVoted(candidate.gender)) {
      toast.error(alreadyVotedMsg);
      return;
    }
    
    // تحديث فوري في الواجهة (Optimistic UI)
    setVotes(prev => prev + 1);
    setIsVotedForThis(true);
    
    const success = await castVote(candidate.id, candidate.gender);
    if (success) {
      toast.success(votedLabel);
      onVoteChange();
    } else {
      // تراجع في حالة فشل السيرفر
      setVotes(prev => prev - 1);
      setIsVotedForThis(false);
    }
  };

  const handleUndo = async () => {
    setVotes(prev => Math.max(0, prev - 1));
    setIsVotedForThis(false);
    
    const success = await undoVote(candidate.id, candidate.gender);
    if (success) {
      onVoteChange();
    } else {
      setVotes(prev => prev + 1);
      setIsVotedForThis(true);
    }
  };

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="container py-8">
      {/* باقي كود التصميم (JSX) كما هو دون تغيير في الهيكل */}
      <button onClick={onBack} className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
        <BackArrow className="h-5 w-5" />
        <span className="font-medium">{backLabel}</span>
      </button>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-gold/20 shadow-2xl">
            <img src={candidate.gallery[selectedImg]} alt={name} className="h-full w-full object-cover object-center" />
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full bg-gold/10 px-4 py-1 text-sm font-bold text-gold border border-gold/20">
                {rankLabel} #{rank + 1}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {votes} {votesLabel}
              </span>
            </div>
            <h2 className="font-display text-5xl font-bold leading-tight">{name}</h2>
          </div>

          <div className="rounded-2xl border border-gold/10 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="mb-3 font-display text-lg font-semibold text-gold">{bioLabel}</h3>
            <p className="text-lg leading-relaxed text-muted-foreground">{candidate.bio[lang]}</p>
          </div>

          <div className="flex flex-wrap gap-4">
            {isVotedForThis ? (
              <button onClick={handleUndo} className="flex flex-1 items-center justify-center gap-3 rounded-2xl border-2 border-gold/50 bg-transparent py-4 font-display text-xl font-bold text-gold transition-all hover:bg-gold/5">
                <Undo2 className="h-6 w-6" />
                {undoLabel}
              </button>
            ) : (
              <button onClick={handleVote} className="gold-gradient flex flex-1 items-center justify-center gap-3 rounded-2xl py-4 font-display text-xl font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
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
