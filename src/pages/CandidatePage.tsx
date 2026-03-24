import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getCandidatesLive, Candidate } from '@/lib/data';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, tr, isRtl, toggleLang } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [rank, setRank] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidate = useCallback(async () => {
    // نجلب القائمة كاملة لنعرف الترتيب الصحيح والأصوات الحية
    const all = await getCandidatesLive('male'); // ستحتاج لتعديل data.ts ليدعم جلب النوعين أو البحث الذكي
    const found = all.find(c => c.id === id) || (await getCandidatesLive('female')).find(c => c.id === id);
    
    if (!found) {
      navigate('/');
      return;
    }

    // حساب الرتبة الحالية
    const sameGenderList = await getCandidatesLive(found.gender);
    const currentRank = sameGenderList.findIndex(c => c.id === id);
    
    setCandidate(found);
    setRank(currentRank);
    setIsLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    loadCandidate();
  }, [loadCandidate]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-gold">Loading Profile...</div>;
  if (!candidate) return null;

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} darkModeLabel={tr('darkMode')} lightModeLabel={tr('lightMode')} />
      <CandidateProfile
        candidate={candidate}
        lang={lang}
        rank={rank}
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
        onVoteChange={loadCandidate}
      />
    </div>
  );
};

export default CandidatePage;
