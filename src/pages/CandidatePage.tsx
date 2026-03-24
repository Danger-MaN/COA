import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates, getCandidatesLive, Candidate } from '@/lib/data';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [candidateWithVotes, setCandidateWithVotes] = useState<Candidate | null>(null);
  const [rank, setRank] = useState<number>((location.state as any)?.rank ?? -1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const base = candidates.find(c => c.id === id);
      if (!base) {
        navigate('/');
        return;
      }
      const liveList = await getCandidatesLive(base.gender);
      const found = liveList.find(c => c.id === id);
      if (found) {
        setCandidateWithVotes(found);
        if (rank === -1) {
          setRank(liveList.findIndex(c => c.id === id) + 1);
        }
      } else {
        setCandidateWithVotes({ ...base, votes: 0 });
        if (rank === -1) setRank(-1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, rank]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);
  useEffect(() => {
    if (refreshKey > 0) fetchData();
  }, [refreshKey, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen marble-texture flex items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

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
        key={`${id}-${refreshKey}`}
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
          <a
            href="https://www.facebook.com/groups/EGY.Model"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground font-display transition-colors hover:text-gold"
          >
            {tr('footer')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default CandidatePage;
