import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, getVotes, updateLiveVote, fetchLiveVotes, candidates as allCandidates } from '@/lib/data';
import { Lang } from '@/lib/i18n';
import { useState, useEffect, useRef } from 'react';
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

export function CandidateProfile({
  candidate,
  lang,
  rank,
  onBack,
  voteLabel,
  votedLabel,
  votesLabel,
  backLabel,
  galleryLabel,
  rankLabel,
  alreadyVotedMsg,
  undoLabel,
  bioLabel,
  onVoteChange,
}: ProfileProps) {
  const [selectedImg, setSelectedImg] = useState(0);
  const [votes, setVotes] = useState(() => getVotes(candidate.id));
  const [hasVoted, setHasVoted] = useState(false);
  const [votedForThis, setVotedForThis] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [localRank, setLocalRank] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [voteTime, setVoteTime] = useState<number | null>(null);

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // جلب حالة التصويت من الخادم
  useEffect(() => {
    async function checkVoteStatus() {
      try {
        const response = await fetch('/.netlify/functions/vote-api');
        // لا يمكننا معرفة حالة التصويت مباشرة من GET، لذلك سنعتمد على استجابة POST
        // نستخدم localStorage مؤقتًا لحفظ حالة التصويت
        const savedVoteTime = localStorage.getItem(`taj_vote_time_${candidate.gender}`);
        if (savedVoteTime) {
          setVoteTime(parseInt(savedVoteTime, 10));
          setHasVoted(true);
          const savedCandidateId = localStorage.getItem(`taj_voted_candidate_${candidate.gender}`);
          setVotedForThis(savedCandidateId === candidate.id);
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
      }
    }
    checkVoteStatus();
  }, [candidate.id, candidate.gender]);

  // حساب المركز إذا لم يتم تمريره
  useEffect(() => {
    if (rank >= 0) return;

    async function calculateRank() {
      try {
        const sameGender = allCandidates.filter(c => c.gender === candidate.gender);
        const withVotes = await Promise.all(
          sameGender.map(async (c) => {
            const liveVotes = await fetchLiveVotes(c.id);
            const staticVotes = getVotes(c.id);
            return { id: c.id, votes: staticVotes + liveVotes };
          })
        );
        const sorted = withVotes.sort((a, b) => b.votes - a.votes);
        const index = sorted.findIndex(item => item.id === candidate.id);
        setLocalRank(index);
      } catch (err) {
        console.error('Error calculating rank:', err);
      }
    }
    calculateRank();
  }, [rank, candidate.id, candidate.gender]);

  // تحديث العداد
  useEffect(() => {
    if (voteTime && hasVoted) {
      const updateCooldown = () => {
        const elapsed = (Date.now() - voteTime) / 1000;
        const remaining = Math.max(0, 3600 - elapsed);
        setCooldownRemaining(remaining);
        
        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
      
      updateCooldown();
      if (cooldownRemaining > 0 && !intervalRef.current) {
        intervalRef.current = setInterval(updateCooldown, 1000);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [voteTime, hasVoted, cooldownRemaining]);

  // جلب الأصوات الحية
  useEffect(() => {
    async function loadLiveVotes() {
      try {
        const liveVotes = await fetchLiveVotes(candidate.id);
        const staticVotes = getVotes(candidate.id);
        setVotes(staticVotes + liveVotes);
      } catch (error) {
        console.error("Error loading live votes:", error);
      }
    }
    loadLiveVotes();
  }, [candidate.id]);

  const handleVote = async () => {
    if (hasVoted) {
      toast.error(alreadyVotedMsg);
      return;
    }
    
    try {
      const result = await updateLiveVote(candidate.id, 'vote');
      
      if (!result.success) {
        if (result.error === 'already_voted') {
          toast.error(result.message || alreadyVotedMsg);
        } else {
          toast.error(result.message || 'حدث خطأ');
        }
        return;
      }
      
      const voteTimestamp = Date.now();
      localStorage.setItem(`taj_vote_time_${candidate.gender}`, voteTimestamp.toString());
      localStorage.setItem(`taj_voted_candidate_${candidate.gender}`, candidate.id);
      setVoteTime(voteTimestamp);
      setHasVoted(true);
      setVotedForThis(true);
      setVotes(getVotes(candidate.id) + (result.votes || 0));
      onVoteChange();
      toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
    } catch (e) {
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
    }
  };

  const handleUndo = async () => {
    if (!voteTime) {
      toast.error(lang === 'ar' ? 'لا يوجد تصويت للتراجع عنه' : 'No vote to undo');
      return;
    }
    
    const elapsed = (Date.now() - voteTime) / 1000;
    if (elapsed < 3600) {
      const minutesLeft = Math.floor((3600 - elapsed) / 60);
      const secondsLeft = Math.floor((3600 - elapsed) % 60);
      const msg = lang === 'ar'
        ? `لا يمكن التراجع إلا بعد ساعة. الوقت المتبقي: ${minutesLeft} دقيقة و ${secondsLeft} ثانية`
        : `You can only undo after one hour. Time remaining: ${minutesLeft} min ${secondsLeft} sec`;
      toast.error(msg);
      return;
    }
    
    try {
      const result = await updateLiveVote(candidate.id, 'undo');
      
      if (!result.success) {
        if (result.error === 'cooldown' && result.minutesLeft !== undefined) {
          toast.error(result.message || 'لا يمكن التراجع الآن');
        } else {
          toast.error(result.message || 'حدث خطأ');
        }
        return;
      }
      
      localStorage.removeItem(`taj_vote_time_${candidate.gender}`);
      localStorage.removeItem(`taj_voted_candidate_${candidate.gender}`);
      setVoteTime(null);
      setHasVoted(false);
      setVotedForThis(false);
      setVotes(getVotes(candidate.id) + (result.votes || 0));
      onVoteChange();
      toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
    } catch (e) {
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
    }
  };

  const socials = [
    { icon: Facebook, url: candidate.facebook, label: 'Facebook' },
    { icon: Twitter, url: candidate.twitter, label: 'Twitter' },
    { icon: Instagram, url: candidate.instagram, label: 'Instagram' },
  ].filter(s => s.url);

  const formatCooldown = () => {
    const minutes = Math.floor(cooldownRemaining / 60);
    const seconds = Math.floor(cooldownRemaining % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayRank = rank >= 0 ? rank : (localRank ?? 0);

  return (
    <div className="container max-w-5xl py-8 animate-fade-up">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]">
        <BackArrow className="h-4 w-4" />
        <span>{backLabel}</span>
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
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

        {/* Info */}
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 text-sm font-bold text-gold">{displayRank + 1}</span>
            <span className="text-sm text-muted-foreground">{rankLabel} #{displayRank + 1}</span>
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
                disabled={cooldownRemaining > 0}
                className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-display text-base font-semibold transition-all duration-200 active:scale-[0.97] ${
                  cooldownRemaining > 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
              >
                <Undo2 className="h-5 w-5" />
                {undoLabel}
                {cooldownRemaining > 0 && (
                  <span className="ml-2 text-xs font-mono bg-background/20 px-2 py-1 rounded-full">
                    {formatCooldown()}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={handleVote}
                disabled={hasVoted}
                className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-display text-base font-semibold transition-all duration-200 active:scale-[0.97] ${
                  hasVoted
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'gold-gradient text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-gold/20'
                }`}
              >
                <Heart className={`h-5 w-5 ${hasVoted ? '' : 'fill-current'}`} />
                {hasVoted ? votedLabel : voteLabel}
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

      {candidate.gallery.length > 1 && (
        <div className="mt-12">
          <h3 className="mb-6 font-display text-xl font-semibold">{galleryLabel}</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {candidate.gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => { setSelectedImg(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="overflow-hidden rounded-2xl border border-gold/10 shadow-lg transition-all duration-300 hover:border-gold/30 hover:shadow-xl active:scale-[0.98]"
              >
                <img src={img} alt={`${name} ${i + 1}`} className="w-full object-cover object-center" style={{ aspectRatio: 'auto', maxHeight: '300px' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
