import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getTop5Live, Candidate } from '@/lib/data';

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [topMale, setTopMale] = useState<Candidate[]>([]);
  const [topFemale, setTopFemale] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [male, female] = await Promise.all([
        getTop5Live('male'),
        getTop5Live('female'),
      ]);
      setTopMale(male);
      setTopFemale(female);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // إعادة الجلب عند التصويت
  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);
  useEffect(() => {
    if (refreshKey > 0) fetchData();
  }, [refreshKey, fetchData]);

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
      <HeroSection
        siteName={tr('siteName')}
        tagline={tr('tagline')}
        ctaText={tr('startVoting')}
        onCtaClick={() => navigate('/select')}
      />

      <section className="container py-12">
        <div className="rounded-2xl border border-gold/10 bg-card/50 p-6 shadow-xl backdrop-blur-sm md:p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
            </div>
          ) : (
            <>
              <Top5Section
                key={`top5-m-${refreshKey}`}
                title={tr('top5')}
                genderLabel={tr('male')}
                candidates={topMale}
                lang={lang}
                votesLabel={tr('votes')}
                onSelect={(id) => navigate(`/candidate/${id}`)}
              />
              <div className="my-6 h-px w-full bg-gold/10" />
              <Top5Section
                key={`top5-f-${refreshKey}`}
                title={tr('top5')}
                genderLabel={tr('female')}
                candidates={topFemale}
                lang={lang}
                votesLabel={tr('votes')}
                onSelect={(id) => navigate(`/candidate/${id}`)}
              />
            </>
          )}
        </div>
      </section>

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

export default Index;
