import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

interface Duty {
  id: string;
  status: string;
  template: { name: string; description?: string; defaultPoints: number };
}

const DUTY_EMOJI: Record<string, string> = {
  'Kitchen': '🍽️', 'Dishes': '🍽️', 'Laundry': '👕', 'Fold': '👕',
  'Sweep': '🧹', 'Entrance': '🚪', 'Bedsheets': '🛏️', 'Litter': '🗑️',
  'Table': '🪑', 'Dog': '🐶', 'Bed': '🛏️', default: '⚡',
};

const getDutyEmoji = (name: string) => {
  const found = Object.entries(DUTY_EMOJI).find(([k]) => name.toLowerCase().includes(k.toLowerCase()));
  return found ? found[1] : DUTY_EMOJI.default;
};

const AVATAR_EMOJI: Record<string, string> = {
  'strawberry-elephant': '🐘', 'ballerina-capuchina': '🩰',
  'disco-panda': '🐼', default: '⭐',
};

const KidHeroView = () => {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { t } = useTranslation();

  useEffect(() => {
    if (user?.id) {
      apiClient.get(`/duties/today/${user.id}`)
        .then(data => setDuties(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  const handleSubmit = async (id: string) => {
    try {
      await apiClient.post(`/duties/${id}/submit`);
      setDuties(prev => prev.map(d => d.id === id ? { ...d, status: 'SUBMITTED' } : d));
    } catch {
      alert('Failed to submit duty.');
    }
  };

  const avatarEmoji = AVATAR_EMOJI[user?.avatarSlug ?? ''] ?? AVATAR_EMOJI.default;
  const done = duties.filter(d => d.status === 'SUBMITTED' || d.status === 'APPROVED').length;
  const total = duties.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
      <div className="text-white text-center animate-pulse">
        <div className="text-6xl mb-4">🦸</div>
        <p className="text-xl font-bold">{t('kid.loading')}</p>
      </div>
    </div>
  );

  return (
    <div data-testid="kid-hero-view" className="min-h-screen" style={{ background: 'linear-gradient(160deg,#0f0c29,#302b63,#24243e)' }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {avatarEmoji}
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium">{t('kid.welcome')}</p>
              <h1 className="text-white text-2xl font-black">{user?.name} 🦸</h1>
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => window.location.href = '/rewards'}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-400 transition-all active:scale-95"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              {t('kid.rewards_btn')}
            </button>
            <button onClick={logout} data-testid="btn-logout"
              className="text-white/40 hover:text-white/80 text-sm font-medium transition-colors">
              {t('exit')}
            </button>
            <LanguageToggle />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-white/80 text-sm font-semibold">{t('kid.progress_label')}</span>
            <span className="text-yellow-400 font-black text-lg">{done}/{total}</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f093fb,#f5576c)' }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2">
            {pct === 100 ? t('kid.all_done') : `${100 - pct}${t('kid.to_go')}`}
          </p>
        </div>
      </div>

      {/* Missions */}
      <div className="px-5 pb-10">
        <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">{t('kid.missions_label')}</h2>
        <div className="space-y-3">
          {duties.length === 0 ? (
            <div className="rounded-3xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-white text-xl font-black">{t('kid.no_duties')}</p>
              <p className="text-white/50 mt-1">{t('kid.no_duties_sub')}</p>
            </div>
          ) : duties.map((duty, i) => {
            const isComplete = duty.status === 'SUBMITTED' || duty.status === 'APPROVED';
            return (
              <div                data-testid="duty-card"                key={duty.id}
                className="rounded-2xl p-5 flex items-center gap-4 transition-all"
                style={{
                  background: isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                  border: isComplete ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: isComplete ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)' }}>
                  {isComplete ? '✅' : getDutyEmoji(duty.template.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
                    {duty.template.name}
                  </p>
                  <p className="text-yellow-400 text-sm font-semibold">+{duty.template.defaultPoints} ⭐</p>
                </div>
                {!isComplete ? (
                  <button
                    data-testid="btn-done"
                    onClick={() => handleSubmit(duty.id)}
                    className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-sm text-white transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }}
                  >
                    {t('kid.btn_done')}
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-emerald-400 text-sm font-bold">{t('kid.status_submitted')}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KidHeroView;
