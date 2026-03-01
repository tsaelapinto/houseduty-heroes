import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

const FEATURE_EMOJIS = ['🏆', '⭐', '🎁', '👨‍👩‍👧‍👦'];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }
  };

  const handleOpenApp = () => {
    if (user) navigate(user.role === 'PARENT' ? '/dashboard' : '/hero');
    else navigate('/login');
  };

  const features = t('landing.features', { returnObjects: true }) as { title: string; desc: string }[];
  const steps = t('landing.steps', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦸</span>
          <span className="text-xl font-black tracking-tight">{t('appName')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button data-testid="nav-login-btn" onClick={handleOpenApp} className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all">
            {user ? t('landing.nav_open') : t('landing.nav_login')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="text-8xl mb-6 animate-bounce">🦸</div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          {t('landing.hero_title1')}<br />
          <span className="text-yellow-300">{t('landing.hero_title2')}</span>
        </h1>
        <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">{t('landing.hero_sub')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={handleOpenApp} className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg rounded-2xl transition-all shadow-xl shadow-yellow-400/30 hover:scale-105 active:scale-95">
            🚀 {user ? t('landing.cta_dashboard') : t('landing.cta_start')}
          </button>
          {installPrompt && !installed && (
            <button onClick={handleInstall} className="px-8 py-4 bg-white/20 hover:bg-white/30 font-bold text-lg rounded-2xl transition-all border border-white/30">
              {t('landing.cta_install')}
            </button>
          )}
          {installed && (
            <div className="px-8 py-4 bg-green-500/30 font-bold text-lg rounded-2xl border border-green-400/50 text-green-300">
              {t('landing.cta_installed')}
            </div>
          )}
        </div>
        <p className="mt-6 text-white/40 text-sm">{t('landing.ios_hint')}</p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">{t('landing.why_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105">
              <div className="text-4xl mb-4">{FEATURE_EMOJIS[i]}</div>
              <h3 className="text-lg font-black mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">{t('landing.how_title')}</h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-4 bg-white/10 rounded-2xl p-5 border border-white/20">
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-lg flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-white/90 font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 max-w-2xl mx-auto border border-white/20">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="text-3xl font-black mb-4">{t('landing.final_title')}</h2>
          <p className="text-white/60 mb-8">{t('landing.final_sub')}</p>
          <button onClick={handleOpenApp} className="px-10 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg rounded-2xl transition-all shadow-xl shadow-yellow-400/30 hover:scale-105 active:scale-95">
            🦸 {user ? t('landing.cta_dashboard') : t('landing.cta_start')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-white/30 text-sm border-t border-white/10">
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  );
}
