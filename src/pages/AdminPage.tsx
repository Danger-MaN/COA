import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { candidates } from '@/lib/data';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AdminPage = () => {
  const { lang, toggleLang, tr, isRtl } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [candidateId, setCandidateId] = useState('');
  const [votes, setVotes] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId || !votes) {
      toast.error(lang === 'ar' ? 'يرجى إدخال معرف الشخصية وعدد الأصوات' : 'Please enter candidate ID and votes');
      return;
    }
    if (password !== 'Danger-MaN') {
      toast.error(lang === 'ar' ? 'الرقم السري غير صحيح' : 'Invalid password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, votes: parseInt(votes, 10), password })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(lang === 'ar' ? 'تم تحديث الأصوات بنجاح' : 'Votes updated successfully');
        setCandidateId('');
        setVotes('');
        setPassword('');
      } else {
        toast.error(data.error || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
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
      <div className="container max-w-md mx-auto py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          ← {lang === 'ar' ? 'العودة إلى الرئيسية' : 'Back to Home'}
        </button>
        <div className="rounded-2xl border border-gold/20 bg-card p-6 shadow-xl">
          <h1 className="font-display text-2xl font-bold text-gold mb-6 text-center">
            {lang === 'ar' ? 'لوحة التحكم' : 'Admin Panel'}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                {lang === 'ar' ? 'معرف الشخصية' : 'Candidate ID'}
              </label>
              <input
                type="text"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                className="w-full rounded-xl border border-gold/20 bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="مثال: m-ahmed"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'ar' ? 'الأكواد المتاحة:' : 'Available IDs:'} {candidates.map(c => c.id).join(', ')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {lang === 'ar' ? 'عدد الأصوات' : 'Votes'}
              </label>
              <input
                type="number"
                value={votes}
                onChange={(e) => setVotes(e.target.value)}
                className="w-full rounded-xl border border-gold/20 bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {lang === 'ar' ? 'الرقم السري' : 'Secret Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gold/20 bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full gold-gradient text-primary-foreground font-display py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {lang === 'ar' ? 'تحديث الأصوات' : 'Update Votes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
