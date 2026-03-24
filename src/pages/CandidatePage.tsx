import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates, getCandidatesLive } from '@/lib/data';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentRank, setCurrentRank] = useState(0);

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);
  const candidate = candidates.find(c => c.id === id);

  useEffect(() => {
    if (candidate) {
      getCandidatesLive(candidate.gender).then(sorted => {
        const index = sorted.findIndex(c => c.id === candidate.id);
        setCurrentRank(index);
      });
    }
  }, [candidate, refreshKey]);

  if (!candidate) return null;

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} darkModeLabel={tr('darkMode')} lightModeLabel={tr('lightMode')} />
      <CandidateProfile
        key={`${id}-${refreshKey}`}
        candidate={candidate}
        lang={lang}
        rank={currentRank}
        onBack={() => navigate(`/vote/${candidate.gender}`)}
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
    </div>
  );
};

export default CandidatePage;
