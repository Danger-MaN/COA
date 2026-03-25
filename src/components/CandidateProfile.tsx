import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, getVotes, fetchLiveVotes, castLiveVote, undoLiveVote, getCandidatesLive, candidates as allCandidates } from '@/lib/data';
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
  const [hasVotedGender, setHasVotedGender] = useState(false);
  const [votedForThis, setVotedForThis] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [voteTime, setVoteTime] = useState<number | null>(null);

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // جلب حالة التصويت من الخادم عند تحميل المكون
  useEffect(() => {
    async function loadVoteStatus() {
      try {
        const response = await fetch(`/.netlify/functions/vote-api?action=status&gender=${candidate.gender}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.voted) {
            setHasVotedGender(true);
            setVotedForThis(data.candidateId === candidate.id);
            if (data.voteTime) {
              setVoteTime(data.voteTime);
            }
          }
        }
      } catch (err) {
        console.error('Error loading vote status:', err);
      }
    }
    loadVoteStatus();
  }, [candidate.id, candidate.gender]);

  // دالة لتحديث الوقت المتبقي
  const updateCooldown = () => {
    if (voteTime && votedForThis) {
      const elapsed = (Date.now() - voteTime) / 1000;
      const remaining = Math.max(0, 3600 - elapsed);
      setCooldownRemaining(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      setCooldownRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // إعداد العداد عند تحميل المكون أو عند تغيير حالة التصويت
  useEffect(() => {
    updateCooldown();
    if (votedForThis && cooldownRemaining > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(updateCooldown, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [votedForThis, voteTime, cooldownRemaining]);

  // جلب الأصوات الحية عند تحميل المكون
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
    if (hasVotedGender) {
      toast.error(alreadyVotedMsg);
      return;
    }
    
    const result = await castLiveVote(candidate.id);
    
    if (!result.success) {
      if (result.error === 'already_voted') {
        toast.error(alreadyVotedMsg);
      } else if (result.error === 'session_mismatch') {
        toast.error(lang === 'ar' ? 'جلسة غير صالحة، يرجى تحديث الصفحة' : 'Invalid session, please refresh');
      } else {
        toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
      }
      return;
    }
    
    setVotes(getVotes(candidate.id) + (result.votes || 0));
    setHasVotedGender(true);
    setVotedForThis(true);
    setVoteTime(Date.now());
    onVoteChange();
    toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
  };

  const handleUndo = async () => {
    if (cooldownRemaining > 0) {
      const minutesLeft = Math.floor(cooldownRemaining / 60);
      const secondsLeft = Math.floor(cooldownRemaining % 60);
      const msg = lang === 'ar'
        ? `لا يمكن التراجع إلا بعد ساعة. الوقت المتبقي: ${minutesLeft} دقيقة و ${secondsLeft} ثانية`
        : `You can only undo after one hour. Time remaining: ${minutesLeft} min ${secondsLeft} sec`;
      toast.error(msg);
      return;
    }
    
    const result = await undoLiveVote(candidate.id);
    
    if (!result.success) {
      if (result.error === 'cooldown') {
        const msg = lang === 'ar'
          ? `لا يمكن التراجع إلا بعد ساعة. الوقت المتبقي: ${result.minutesLeft} دقيقة و ${result.secondsLeft} ثانية`
          : `You can only undo after one hour. Time remaining: ${result.minutesLeft} min ${result.secondsLeft} sec`;
        toast.error(msg);
      } else if (result.error === 'no_vote_to_undo') {
        toast.error(lang === 'ar' ? 'لا يوجد تصويت للإلغاء' : 'No vote to undo');
      } else {
        toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
      }
      return;
    }
    
    setVotes(getVotes(candidate.id) + (result.votes || 0));
    setHasVotedGender(false);
    setVotedForThis(false);
    setVoteTime(null);
    onVoteChange();
    toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/30 text-sm font-bold text-gold">{rank}</span>
            <span className="text-sm text-muted-foreground">{rankLabel} #{rank}</span>
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
