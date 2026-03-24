import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateCard } from '@/components/CandidateCard';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getCandidatesLive, Gender, Candidate } from '@/lib/data';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

const VotingPage = () => {
  const { gender } = useParams<{ gender: string }>();
  const navigate = useNavigate();
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);

  const validGender: Gender = gender === 'female' ? 'female' : 'male';
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    getCandidatesLive(validGender).then(setCandidatesList);
  }, [validGender, refreshKey]);

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} darkModeLabel={tr('darkMode')} lightModeLabel={tr('lightMode')} />
      <div className="container py-8">
        <button onClick={() => navigate('/select')} className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]">
          <BackArrow className="h-4 w-4" />
          <span>{tr('backHome')}</span>
        </button>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold"><span className="gold-text-gradient">{validGender === 'male' ? tr('male') : tr('female')}</span></h2>
        </div>

        <div className="mb-8 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-3.5">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-gold" />
          <p className="text-sm text-muted-foreground">{tr('oneVoteWarning')}</p>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {candidatesList.map((c, i) => (
            <CandidateCard
              key={`${c.id}-${refreshKey}`}
              candidate={c}
              lang={lang}
              rank={i}
              votedLabel={tr('voted')}
              votesLabel={tr('votes')}
              onSelect={(id) => navigate(`/candidate/${id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VotingPage;
