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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);
  const validGender: Gender = gender === 'female' ? 'female' : 'male';
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCandidatesLive(validGender);
      setCandidates(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [validGender]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (refreshKey > 0) fetchCandidates();
  }, [refreshKey, fetchCandidates]);

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header ... />
      <div className="container py-8">
        <button onClick={() => navigate('/select')} className="mb-6 flex items-center gap-2 ...">
          <BackArrow className="h-4 w-4" />
          <span>{tr('backHome')}</span>
        </button>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold">
            <span className="gold-text-gradient">{validGender === 'male' ? tr('male') : tr('female')}</span>
          </h2>
        </div>
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-3.5">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-gold" />
          <p className="text-sm text-muted-foreground">{tr('oneVoteWarning')}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {candidates.map((c, i) => (
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
        )}
      </div>
      <footer ... />
    </div>
  );
};

export default VotingPage;
