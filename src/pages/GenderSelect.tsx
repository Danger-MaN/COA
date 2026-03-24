import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { Crown, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';

const GenderSelect = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
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

      <div ref={containerRef} className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12">
        <Crown className="mb-6 h-16 w-16 text-gold drop-shadow-lg" />
        <h2 className="mb-3 font-display text-3xl font-bold md:text-5xl">
          <span className="gold-text-gradient">{tr('chooseCategory')}</span>
        </h2>
        <p className="mb-4 max-w-md text-center text-muted-foreground text-lg" style={{ textWrap: 'balance' }}>
          {tr('votingNotice')}
        </p>

        {/* Warning notice */}
        <div className="mb-10 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold-dark dark:text-gold-light">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{tr('oneVoteWarning')}</span>
        </div>

        <div className="grid w-full max-w-lg gap-6 md:grid-cols-2">
          {/* Male */}
          <button
            onClick={() => navigate('/vote/male')}
            className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card p-8 text-center shadow-xl transition-all duration-500 hover:border-gold/50 hover:shadow-2xl hover:shadow-gold/10 active:scale-[0.97]"
          >
            <div className="absolute inset-0 gold-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-[0.07]" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/10 transition-all duration-300 group-hover:border-gold group-hover:bg-gold/20">
                <Users className="h-9 w-9 text-gold" />
              </div>
              <h3 className="font-display text-2xl font-bold">{tr('male')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{tr('browseMale')}</p>
            </div>
          </button>

          {/* Female */}
          <button
            onClick={() => navigate('/vote/female')}
            className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card p-8 text-center shadow-xl transition-all duration-500 hover:border-gold/50 hover:shadow-2xl hover:shadow-gold/10 active:scale-[0.97]"
          >
            <div className="absolute inset-0 gold-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-[0.07]" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/10 transition-all duration-300 group-hover:border-gold group-hover:bg-gold/20">
                <Crown className="h-9 w-9 text-gold" />
              </div>
              <h3 className="font-display text-2xl font-bold">{tr('female')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{tr('browseFemale')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenderSelect;
