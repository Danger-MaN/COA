import { useState, useCallback, useEffect } from 'react'; // أضفنا useEffect
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getTop5, fetchLiveVotes } from '@/lib/data'; // استيراد fetchLiveVotes

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // حالة التحميل
  const navigate = useNavigate();

  // جلب البيانات عند تحميل المكون لأول مرة
  useEffect(() => {
    const init = async () => {
      try {
        await fetchLiveVotes(); // جلب الأصوات من السيرفر
      } finally {
        setIsLoading(false); // إيقاف التحميل سواء نجح الجلب أو فشل
      }
    };
    init();
  }, []);

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);

  // شاشة تحميل بسيطة وأنيقة
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
      </div>
    );
  }

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

      <footer className="border-t border-gold/20 py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground italic">AUREUS © 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
