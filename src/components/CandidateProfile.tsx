import { ArrowRight, ArrowLeft, Heart, Undo2, Facebook, Twitter, Instagram } from 'lucide-react';
import { Candidate, hasVoted, castVote, undoVote, getVotedCandidateId } from '@/lib/data';
import { useVotes } from '@/context/VotesContext';
import { Lang } from '@/lib/i18n';
import { useState } from 'react';
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
  const name = candidate.name;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const { updateLiveVote } = useVotes();

  const [hasVotedGender, setHasVotedGender] = useState(() => hasVoted(candidate.gender));
  const [votedForThis, setVotedForThis] = useState(() => getVotedCandidateId(candidate.gender) === candidate.id);

  const handleVote = async () => {
    if (hasVotedGender) {
      toast.error(alreadyVotedMsg);
      return;
    }
    try {
      await updateLiveVote(candidate.id, 'vote');
      const success = castVote(candidate.id, candidate.gender);
      if (success) {
        setHasVotedGender(true);
        setVotedForThis(true);
        onVoteChange();
        toast.success(lang === 'ar' ? `تم التصويت لـ ${name}` : `Voted for ${name}`);
      }
    } catch (e) {
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
    }
  };

  const handleUndo = async () => {
    try {
      await updateLiveVote(candidate.id, 'undo');
      const success = undoVote(candidate.gender);
      if (success) {
        setHasVotedGender(false);
        setVotedForThis(false);
        onVoteChange();
        toast.success(lang === 'ar' ? 'تم إلغاء التصويت' : 'Vote cancelled');
      }
    } catch (e) {
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error');
    }
  };

  const socials = [
    { icon: Facebook, url: candidate.facebook, label: 'Facebook' },
    { icon: Twitter, url: candidate.twitter, label: 'Twitter' },
    { icon: Instagram, url: candidate.instagram, label: 'Instagram' },
  ].filter(s => s.url);

  return (
    <div className="container max-w-5xl py-8 animate-fade-up">
      {/* ... باقي JSX كما هو ... */}
      {/* فقط تأكد من عرض الأصوات: */}
      <p className="mt-4 text-xl text-gold font-display">{candidate.votes ?? 0} {votesLabel}</p>
      {/* باقي المحتوى */}
    </div>
  );
}
