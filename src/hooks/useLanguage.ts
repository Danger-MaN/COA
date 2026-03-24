import { useState, useEffect, useCallback } from 'react';
import { Lang, t } from '@/lib/i18n';

export function useLanguage() {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('taj_lang') as Lang) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('taj_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);

  const tr = useCallback((key: Parameters<typeof t>[1]) => t(lang, key), [lang]);

  return { lang, toggleLang, tr, isRtl: lang === 'ar' };
}
