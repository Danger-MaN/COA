import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CandidateCard } from '@/components/CandidateCard';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getCandidatesLive, Gender, Candidate } from '@/lib/data';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const VotingPage = () => {
  const { gender } = useParams<{ gender: string }>();
  const navigate = useNavigate();
  const { lang, tr, isRtl } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [list, setList] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const validGender: Gender = gender === 'female' ? 'female' : 'male';

  useEffect(() => {
    setLoading(true);
    getCandidatesLive(validGender).then(data => {
      setList(data);
      setLoading(false);
    });
  }, [validGender]);

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={() => {}} darkModeLabel="" lightModeLabel="" />
      <div className="container py-8">
        <button onClick={() => navigate('/select')} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground">
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{tr('backHome')}</span>
        </button>
        <h2 className="mb-8 font-display text-3xl font-bold gold-text-gradient">{validGender === 'male' ? tr('male') : tr('female')}</h2>
        
        {loading ? (
          <div className="flex justify-center py-20 text-gold animate-pulse">Loading Live Data...</div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {list.map((c, i) => (
              <CandidateCard key={c.id} candidate={c} lang={lang} rank={i} votesLabel={tr('votes')} votedLabel={tr('voted')} onSelect={(id) => navigate(`/candidate/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingPage;
