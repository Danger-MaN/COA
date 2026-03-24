import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useVotes } from '@/context/VotesContext';
import { candidates, getVotes } from '@/lib/data';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const { liveVotes, refreshLiveVotes } = useVotes();

  const candidateWithVotes = useMemo(() => {
    const base = candidates.find(c => c.id === id);
    if (!base) return null;
    const totalVotes = (getVotes(base.id) || 0) + (liveVotes[base.id] || 0);
    return { ...base, votes: totalVotes };
  }, [id, liveVotes]);

  const rank = useMemo(() => {
    if (!candidateWithVotes) return -1;
    const sameGender = candidates.filter(c => c.gender === candidateWithVotes.gender);
    const withVotes = sameGender.map(c => ({
      id: c.id,
      votes: (getVotes(c.id) || 0) + (liveVotes[c.id] || 0)
    })).sort((a, b) => b.votes - a.votes);
    return withVotes.findIndex(c => c.id === candidateWithVotes.id);
  }, [candidateWithVotes, liveVotes]);

  const onVoteChange = () => refreshLiveVotes();

  if (!candidateWithVotes) return null;

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header
        siteName={tr('siteName')}
        isDark={isDark}
        toggleTheme={toggleTheme}
        lang={lang}
        toggleLang={toggleLang}
        darkModeLabel={tr('darkMode')}
        lightModeLabel={tr('lightMode')}
      />
      <CandidateProfile
        key={`${id}-${Object.keys(liveVotes).length}`}
        candidate={candidateWithVotes}
        lang={lang}
        rank={rank}
        onBack={() => navigate(`/vote/${candidateWithVotes.gender}`)}
        voteLabel={tr('vote')}
        votedLabel={tr('voted')}
        votesLabel={tr('votes')}
        backLabel={tr('backHome')}
        galleryLabel={tr('gallery')}
        rankLabel={tr('rank')}
        bioLabel={tr('bio')}
        alreadyVotedMsg={tr('alreadyVoted')}
        undoLabel={tr('undoVote')}
        onVoteChange={onVoteChange}
      />
      <footer className="border-t border-gold/20 py-8">
        <div className="container text-center">
          <a href="https://www.facebook.com/groups/EGY.Model" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground font-display transition-colors hover:text-gold">
            {tr('footer')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default CandidatePage;
