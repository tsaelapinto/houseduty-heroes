import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const features = [
  {
    emoji: '🏆',
    title: 'Heroic Duties',
    desc: 'Each chore is a quest. Kids see their missions clearly and feel the satisfaction of completing them.',
  },
  {
    emoji: '⭐',
    title: 'Earn Stars',
    desc: "Complete duties to earn stars. Parents approve, kids celebrate. Real progress, real rewards.",
  },
  {
    emoji: '🎁',
    title: 'Rewards Shop',
    desc: 'Spend stars on real rewards set by parents — screen time, treats, outings, or anything you choose.',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Family Dashboard',
    desc: "Parents manage the whole household from one place. Add heroes, assign duties, track progress.",
  },
];

const steps = [
  { n: '1', text: 'Parent signs up and creates the family' },
  { n: '2', text: 'Add your kids as Hero profiles' },
  { n: '3', text: 'Assign weekly duties to each hero' },
  { n: '4', text: 'Kids complete duties & earn stars' },
  { n: '5', text: 'Redeem stars for awesome rewards!' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }
  };

  const handleOpenApp = () => {
    if (user) {
      navigate(user.role === 'PARENT' ? '/dashboard' : '/hero');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦸</span>
          <span className="text-xl font-black tracking-tight">HouseDuty Heroes</span>
        </div>
        <button
          onClick={handleOpenApp}
          className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all"
        >
          {user ? 'Open Dashboard →' : 'Log In →'}
        </button>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="text-8xl mb-6 animate-bounce">🦸</div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          Turn Chores Into<br />
          <span className="text-yellow-300">Superpowers</span>
        </h1>
        <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          HouseDuty Heroes makes helping at home fun. Kids complete duties, earn stars,
          and unlock real rewards — while parents stay in control.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleOpenApp}
            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg rounded-2xl transition-all shadow-xl shadow-yellow-400/30 hover:scale-105 active:scale-95"
          >
            🚀 {user ? 'Open My Dashboard' : 'Get Started Free'}
          </button>
          {installPrompt && !installed && (
            <button
              onClick={handleInstall}
              className="px-8 py-4 bg-white/20 hover:bg-white/30 font-bold text-lg rounded-2xl transition-all border border-white/30"
            >
              📲 Install App
            </button>
          )}
          {installed && (
            <div className="px-8 py-4 bg-green-500/30 font-bold text-lg rounded-2xl border border-green-400/50 text-green-300">
              ✅ App Installed!
            </div>
          )}
        </div>

        {/* Install hint for iOS */}
        <p className="mt-6 text-white/40 text-sm">
          📱 On iPhone: tap <strong>Share → Add to Home Screen</strong> to install
        </p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">
          Why Heroes Love It
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h3 className="text-lg font-black mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">How It Works</h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="flex items-center gap-4 bg-white/10 rounded-2xl p-5 border border-white/20">
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-lg flex-shrink-0">
                {s.n}
              </div>
              <p className="text-white/90 font-medium">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 max-w-2xl mx-auto border border-white/20">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="text-3xl font-black mb-4">Ready to Build Your Hero Team?</h2>
          <p className="text-white/60 mb-8">Free to use. No credit card. Takes 2 minutes to set up.</p>
          <button
            onClick={handleOpenApp}
            className="px-10 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg rounded-2xl transition-all shadow-xl shadow-yellow-400/30 hover:scale-105 active:scale-95"
          >
            🦸 {user ? 'Go to Dashboard' : 'Start for Free'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-white/30 text-sm border-t border-white/10">
        <p>🦸 HouseDuty Heroes · Making home chores heroic</p>
      </footer>
    </div>
  );
}
