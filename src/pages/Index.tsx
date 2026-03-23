import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getTop5 } from '@/lib/data';

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);

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

      {/* Top 5 Section */}
      <section className="container py-12">
        <div className="rounded-2xl border border-gold/10 bg-card/50 p-6 shadow-xl backdrop-blur-sm md:p-8">
          <Top5Section
            key={`top5-m-${refreshKey}`}
            title={tr('top5')}
            genderLabel={tr('male')}
            candidates={getTop5('male')}
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={(id) => navigate(`/candidate/${id}`)}
          />
          <div className="my-6 h-px w-full bg-gold/10" />
          <Top5Section
            key={`top5-f-${refreshKey}`}
            title={tr('top5')}
            genderLabel={tr('female')}
            candidates={getTop5('female')}
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={(id) => navigate(`/candidate/${id}`)}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/20 py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground font-display">{tr('footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
