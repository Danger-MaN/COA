import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getTop5, getTop5WithLive, Candidate } from '@/lib/data';
import { useLiveVotes } from '@/contexts/LiveVotesContext';

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const { liveVotes, isLoading: liveLoading } = useLiveVotes();
  const [refreshKey, setRefreshKey] = useState(0);
  const [topMale, setTopMale] = useState<Candidate[]>(() => getTop5('male'));
  const [topFemale, setTopFemale] = useState<Candidate[]>(() => getTop5('female'));
  const navigate = useNavigate();

  // عند تحميل الأصوات الحية، نقوم بتحديث القوائم
  useEffect(() => {
    if (!liveLoading && Object.keys(liveVotes).length > 0) {
      setTopMale(getTop5WithLive('male', liveVotes));
      setTopFemale(getTop5WithLive('female', liveVotes));
      setRefreshKey(k => k + 1);
    }
  }, [liveVotes, liveLoading]);

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
        </div>
      </section>

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

export default Index;
