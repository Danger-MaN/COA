import { Moon, Sun, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import crownLogo from '@/assets/crown-logo.png';

interface HeaderProps {
  siteName: string;
  isDark: boolean;
  toggleTheme: () => void;
  lang: string;
  toggleLang: () => void;
  darkModeLabel: string;
  lightModeLabel: string;
}

export function Header({ siteName, isDark, toggleTheme, lang, toggleLang, darkModeLabel, lightModeLabel }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/10 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img src={crownLogo} alt="" className="h-9 w-9 object-contain" />
          <h1 className="font-display text-lg font-bold gold-text-gradient">{siteName}</h1>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
            aria-label="Toggle language"
          >
            <Languages className="h-4 w-4" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
            aria-label={isDark ? lightModeLabel : darkModeLabel}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
