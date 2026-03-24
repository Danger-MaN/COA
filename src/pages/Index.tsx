import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useVotes } from '@/context/VotesContext';
import { candidates, getVotes } from '@/lib/data';
import { Candidate } from '@/lib/data';

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const { liveVotes, refreshLiveVotes } = useVotes();

  // حساب top5 للمتقدمين
  const topMale = useMemo(() => {
    const maleCandidates = candidates.filter(c => c.gender === 'male');
    const withVotes = maleCandidates.map(c => ({
      ...c,
      votes: (getVotes(c.id) || 0) + (liveVotes[c.id] || 0)
    }));
    return withVotes.sort((a, b) => b.votes! - a.votes!).slice(0, 5);
  }, [liveVotes]);

  const topFemale = useMemo(() => {
    const femaleCandidates = candidates.filter(c => c.gender === 'female');
    const withVotes = femaleCandidates.map(c => ({
      ...c,
      votes: (getVotes(c.id) || 0) + (liveVotes[c.id] || 0)
    }));
    return withVotes.sort((a, b) => b.votes! - a.votes!).slice(0, 5);
  }, [liveVotes]);

  const onVoteChange = () => refreshLiveVotes();

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
            key={`top5-m-${Object.keys(liveVotes).length}`}
            title={tr('top5')}
            genderLabel={tr('male')}
            candidates={topMale}
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={(id) => navigate(`/candidate/${id}`)}
          />
          <div className="my-6 h-px w-full bg-gold/10" />
          <Top5Section
            key={`top5-f-${Object.keys(liveVotes).length}`}
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
          <a href="https://www.facebook.com/groups/EGY.Model" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground font-display transition-colors hover:text-gold">
            {tr('footer')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
