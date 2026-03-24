import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates, getCandidatesSorted } from '@/lib/data';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);

  const candidate = candidates.find(c => c.id === id);
  if (!candidate) {
    navigate('/');
    return null;
  }

  const sorted = getCandidatesSorted(candidate.gender);
  const rankMap = Object.fromEntries(sorted.map((c, i) => [c.id, i]));

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
        candidate={candidate}
        lang={lang}
        rank={rankMap[candidate.id]}
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
      <footer className="border-t border-gold/20 py-8">
        <div className="container text-center">
          <a href="https://www.facebook.com/groups/EGY.Model" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground font-display transition-colors hover:text-gold">{tr('footer')}</a>
        </div>
      </footer>
    </div>
  );
};

export default CandidatePage;
