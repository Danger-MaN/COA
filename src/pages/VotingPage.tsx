import { useState, useEffect } from 'react';
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
  const { lang, tr, isRtl, toggleLang } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const validGender: Gender = gender === 'female' ? 'female' : 'male';

  useEffect(() => {
    const fetchList = async () => {
      setIsLoading(true);
      const data = await getCandidatesLive(validGender);
      setCandidates(data);
      setIsLoading(false);
    };
    fetchList();
  }, [validGender]);

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} darkModeLabel={tr('darkMode')} lightModeLabel={tr('lightMode')} />
      <div className="container py-8">
        <button onClick={() => navigate('/select')} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{tr('backHome')}</span>
        </button>

        <h2 className="mb-8 font-display text-3xl font-bold"><span className="gold-text-gradient">{validGender === 'male' ? tr('male') : tr('female')}</span></h2>

        <div className="mb-8 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-3.5">
          <AlertTriangle className="h-5 w-5 text-gold" />
          <p className="text-sm text-muted-foreground">{tr('oneVoteWarning')}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] bg-gold/5 animate-pulse rounded-2xl border border-gold/10"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {candidates.map((c, i) => (
              <CandidateCard key={c.id} candidate={c} lang={lang} rank={i} votesLabel={tr('votes')} votedLabel={tr('voted')} onSelect={(id) => navigate(`/candidate/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingPage;
