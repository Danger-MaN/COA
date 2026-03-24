import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates, getVotes } from '@/lib/data';
import { useMemo, useCallback, useState } from 'react';

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const allMale = useMemo(() => {
    return candidates
      .filter(c => c.gender === 'male')
      .map(c => ({ ...c, votes: getVotes(c.id) }));
  }, []);

  const allFemale = useMemo(() => {
    return candidates
      .filter(c => c.gender === 'female')
      .map(c => ({ ...c, votes: getVotes(c.id) }));
  }, []);

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleSelect = (id: string, rank: number) => {
    navigate(`/candidate/${id}`, { state: { rank } });
  };

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
            candidates={allMale}
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={handleSelect}
          />
          <div className="my-6 h-px w-full bg-gold/10" />
          <Top5Section
            key={`top5-f-${refreshKey}`}
            title={tr('top5')}
            genderLabel={tr('female')}
            candidates={allFemale}
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={handleSelect}
            limit={10}   // عرض أول 10
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
