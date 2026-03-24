import { useEffect, useRef } from 'react';
import marbleBg from '@/assets/marble-bg.jpg';
import crownLogo from '@/assets/crown-logo.png';

interface HeroProps {
  siteName: string;
  tagline: string;
  ctaText: string;
  onCtaClick: () => void;
}

export function HeroSection({ siteName, tagline, ctaText, onCtaClick }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.filter = 'blur(4px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1), filter 1s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.filter = 'blur(0)';
    });
  }, []);

  return (
    <section className="relative overflow-hidden py-24 md:py-36">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img src={marbleBg} alt="" className="h-full w-full object-cover opacity-15 dark:opacity-8" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>
      
      <div ref={ref} className="container relative z-10 flex flex-col items-center text-center">
        <div className="mb-8 relative">
          <img src={crownLogo} alt="" className="h-28 w-28 object-contain md:h-36 md:w-36 drop-shadow-2xl" />
          <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full -z-10" />
        </div>
        
        <h2 className="font-display text-4xl font-bold md:text-6xl lg:text-7xl" style={{ lineHeight: '1.05' }}>
          <span className="gold-text-gradient">{siteName}</span>
        </h2>
        
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl" style={{ textWrap: 'balance' }}>
          {tagline}
        </p>
        
        <button
          onClick={onCtaClick}
          className="gold-gradient mt-12 rounded-2xl px-10 py-4 font-display text-lg font-semibold text-primary-foreground shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-gold/25 active:scale-[0.97] hover:-translate-y-0.5"
        >
          {ctaText}
        </button>

        <div className="mt-16 h-px w-48 gold-gradient rounded-full opacity-40" />
      </div>
    </section>
  );
}
