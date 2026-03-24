import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateProfile } from '@/components/CandidateProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates, getCandidatesWithLive, Candidate } from '@/lib/data';
import { useLiveVotes } from '@/contexts/LiveVotesContext';

const CandidatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const { liveVotes, isLoading: liveLoading } = useLiveVotes();
  const [refreshKey, setRefreshKey] = useState(0);
  const [candidateWithVotes, setCandidateWithVotes] = useState<Candidate | null>(null);
  const [rank, setRank] = useState(-1);

  // البحث عن المرشح الأساسي (بياناته الثابتة)
  const baseCandidate = candidates.find(c => c.id === id);

  // إذا لم يوجد المرشح، التوجيه للصفحة الرئيسية
  if (!baseCandidate) {
    navigate('/');
    return null;
  }

  // حساب الترتيب والأصوات الأولية (بدون الأصوات الحية)
  useEffect(() => {
    // عرض المرشح فوراً بالأصوات الثابتة
    setCandidateWithVotes({
      ...baseCandidate,
      votes: baseCandidate.votes ?? 0,
    });
    setRank(-1); // الترتيب سيُحسب لاحقاً بعد الأصوات الحية
  }, [baseCandidate]);

  // تحديث البيانات عند تحميل الأصوات الحية
  useEffect(() => {
    if (!liveLoading && candidateWithVotes) {
      const allOfGender = getCandidatesWithLive(baseCandidate.gender, liveVotes);
      const found = allOfGender.find(c => c.id === id);
      if (found) {
        setCandidateWithVotes(found);
        setRank(allOfGender.findIndex(c => c.id === id));
      }
      setRefreshKey(k => k + 1);
    }
  }, [liveVotes, liveLoading, id, baseCandidate.gender, candidateWithVotes]);

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
        onVoteChange={() => {}} // سنقوم بتعديله لاحقاً لتحديث Context
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
