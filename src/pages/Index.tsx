import { useState, useCallback, useEffect } from 'react'; // أضفنا useEffect
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Top5Section } from '@/components/Top5Section';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getTop5Live, Candidate } from '@/lib/data'; // استبدل getTop5 بـ getTop5Live

const Index = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [maleTop5, setMaleTop5] = useState<Candidate[]>([]);
  const [femaleTop5, setFemaleTop5] = useState<Candidate[]>([]);
  const navigate = useNavigate();

  const onVoteChange = useCallback(() => setRefreshKey(k => k + 1), []);

  // جلب البيانات الحية عند التحميل أو عند حدوث تصويت جديد
  useEffect(() => {
    getTop5Live('male').then(setMaleTop5);
    getTop5Live('female').then(setFemaleTop5);
  }, [refreshKey]);

  return (
    <div className="min-h-screen marble-texture" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header siteName={tr('siteName')} isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} darkModeLabel={tr('darkMode')} lightModeLabel={tr('lightMode')} />
      <HeroSection siteName={tr('siteName')} tagline={tr('tagline')} ctaText={tr('startVoting')} onCtaClick={() => navigate('/select')} />

      <section className="container py-12">
        <div className="rounded-2xl border border-gold/10 bg-card/50 p-6 shadow-xl backdrop-blur-sm md:p-8">
          <Top5Section
            key={`top5-m-${refreshKey}`}
            title={tr('top5')}
            genderLabel={tr('male')}
            candidates={maleTop5} // نستخدم الـ State الجديد
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={(id) => navigate(`/candidate/${id}`)}
          />
          <div className="my-6 h-px w-full bg-gold/10" />
          <Top5Section
            key={`top5-f-${refreshKey}`}
            title={tr('top5')}
            genderLabel={tr('female')}
            candidates={femaleTop5} // نستخدم الـ State الجديد
            lang={lang}
            votesLabel={tr('votes')}
            onSelect={(id) => navigate(`/candidate/${id}`)}
          />
        </div>
      </section>
      {/* Footer ... */}
    </div>
  );
};

export default Index;
