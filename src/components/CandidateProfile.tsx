import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, getVotes, hasVoted, castVote, getVotedCandidateId, fetchLiveVotes } from '@/lib/data';
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
  const [votes, setVotes] = useState(() => getVotes(candidate.id));
  const [hasVotedGender, setHasVotedGender] = useState(() => hasVoted(candidate.gender));
  const [votedForThis, setVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);
  const [selectedImg, setSelectedImg] = useState(0);
  const [isVoting, setIsVoting] = useState(false);

  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    fetchLiveVotes().then(() => {
      setVotes(getVotes(candidate.id));
    });
  }, [candidate.id]);

  const handleVote = async () => {
    if (hasVotedGender || isVoting) return;
    setIsVoting(true);
    const success = await castVote(candidate.id, candidate.gender);
    if (success) {
      setVotes(getVotes(candidate.id));
      setHasVotedGender(true);
      setVotedForThis(true);
      onVoteChange();
      toast.success(votedLabel);
    }
    setIsVoting(false);
  };

  const socials = [
    { icon: Facebook, url: candidate.facebook, label: 'Facebook' },
    { icon: Twitter, url: candidate.twitter, label: 'Twitter' },
    { icon: Instagram, url: candidate.instagram, label: 'Instagram' },
  ].filter(s => s.url);

  return (
    <div className="container py-8 md:py-12">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
      >
        <BackArrow className="h-4 w-4" />
        <span>{backLabel}</span>
      </button>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-gold/20 shadow-2xl">
            <img 
              src={candidate.gallery[selectedImg]} 
              alt={name} 
              className="h-full w-full object-cover object-center transition-all duration-700"
            />
            <div className="absolute top-4 start-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 backdrop-blur-md text-lg font-bold text-gold border border-gold/20 shadow-xl">
              #{rank + 1}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <div className="mb-6">
            <h2 className="font-display text-4xl font-bold md:text-5xl">{name}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{votesLabel}</span>
                <span className="text-2xl font-bold gold-text-gradient">{votes}</span>
              </div>
              <div className="h-10 w-px bg-gold/20" />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{rankLabel}</span>
                <span className="text-2xl font-bold">#{rank + 1}</span>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-gold/10 bg-gold/5 p-6 backdrop-blur-sm">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {bioLabel}
            </h3>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-line">{candidate.bio}</p>
          </div>

          <div className="mt-auto space-y-6">
            <button
              onClick={handleVote}
              disabled={hasVotedGender || isVoting}
              className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-4 font-bold transition-all duration-500 ${
                hasVotedGender 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'gold-gradient text-primary-foreground shadow-lg shadow-gold/20 hover:scale-[1.02] hover:shadow-gold/40 active:scale-[0.98]'
              }`}
            >
              <Heart className={`h-5 w-5 ${votedForThis ? 'fill-current' : ''}`} />
              <span className="relative z-10">
                {isVoting ? '...' : (votedForThis ? votedLabel : (hasVotedGender ? alreadyVotedMsg : voteLabel))}
              </span>
            </button>

            {socials.length > 0 && (
              <div className="flex items-center gap-4">
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
