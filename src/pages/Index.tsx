import { useState, useEffect } from 'react';
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
  const [maleTop5, setMaleTop5] = useState<Candidate[]>([]);
  const [femaleTop5, setFemaleTop5] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true); // حالة تحميل لضمان جلب البيانات أولاً
  const navigate = useNavigate();

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        // ننتظر جلب البيانات من السيرفر والملفات معاً قبل العرض
        const [males, females] = await Promise.all([
          getTop5Live('male'),
          getTop5Live('female')
        ]);
        
        setMaleTop5(males);
        setFemaleTop5(females);
      } catch (error) {
        console.error("Error loading top 5:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

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
          {isLoading ? (
            // شاشة تحميل بسيطة لحين جلب البيانات
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
               <p className="text-gold font-display animate-pulse">جاري جلب القائمة الذهبية...</p>
            </div>
          ) : (
            <>
              <Top5Section
                title={tr('top5')}
                genderLabel={tr('male')}
                candidates={maleTop5}
                lang={lang}
                votesLabel={tr('votes')}
                onSelect={(id) => navigate(`/candidate/${id}`)}
              />
              <div className="my-6 h-px w-full bg-gold/10" />
              <Top5Section
                title={tr('top5')}
                genderLabel={tr('female')}
                candidates={femaleTop5}
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
          <a href="https://www.facebook.com/groups/EGY.Model" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-gold transition-colors">
            {tr('footer')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
