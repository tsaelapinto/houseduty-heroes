import { useEffect, useRef, useState, useCallback } from 'react';
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
  'Table': '🪑', 'Dog': '🐶', 'Bed': '🛏️', 'Vacuum': '🧹', 'Trash': '🗑️',
  'Refrigerator': '🧊', 'Fridge': '🧊', 'Pet': '🐾', 'Feed': '🐾',
  default: '⚡',
};
const getDutyEmoji = (name: string) => {
  const found = Object.entries(DUTY_EMOJI).find(([k]) => k !== 'default' && name.toLowerCase().includes(k.toLowerCase()));
  return found ? found[1] : DUTY_EMOJI.default;
};

const AVATAR_EMOJI: Record<string, string> = {
  'strawberry-elephant': '🐘', 'ballerina-capuchina': '🩰',
  'disco-panda': '🐼', 'super-rocket': '🚀', 'ninja-turtle': '🐢', 'robo-cat': '🤖', default: '⭐',
};

// ── Confetti colours & shapes ────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#f93939','#ff6b35','#ffd93d','#6bcb77','#4d96ff',
  '#ff6bff','#ffffff','#ff9ff3','#ffa94d','#a9def9',
];
const CONFETTI_SHAPES = ['rounded-sm', 'rounded-full', ''];

// ── Confetti overlay ─────────────────────────────────────────────────────
const Confetti = ({ points }: { points: number }) => {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${(i * 17.3 + 5) % 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
    size: 6 + (i % 4) * 4,
    fallDuration: 1.8 + (i % 6) * 0.25,
    driftDuration: 0.6 + (i % 5) * 0.2,
    delay: (i * 0.04) % 0.8,
  }));
  const celebEmojis = ['🎉','🎊','🌟','⭐','🏆','🦸','🥳','🎈','✨','🎆'];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none overlay-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
    >
      {pieces.map(p => (
        <div
          key={p.id}
          className={`confetti-piece ${p.shape}`}
          style={{
            left: p.left,
            width: p.size, height: p.size,
            background: p.color,
            animationDuration: `${p.fallDuration}s, ${p.driftDuration}s`,
            animationDelay: `${p.delay}s, 0s`,
          }}
        />
      ))}
      <div className="flex flex-col items-center gap-4 burst-scale-anim">
        <div className="flex flex-wrap justify-center gap-3 text-4xl max-w-xs">
          {celebEmojis.map((e, i) => (
            <span key={i} className="shake-clap-anim" style={{ animationDelay: `${i * 0.06}s` }}>{e}</span>
          ))}
        </div>
        <div
          className="star-pop-anim flex items-center gap-2 px-8 py-4 rounded-3xl font-black shadow-2xl"
          style={{
            fontSize: '3rem',
            background: 'linear-gradient(135deg,#ffd93d,#ff6b35)',
            color: '#fff',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            boxShadow: '0 8px 32px rgba(255,107,53,0.5)',
          }}
        >
          +{points} ⭐
        </div>
        <p className="text-white text-2xl font-black mt-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          Amazing! 🦸‍♂️
        </p>
      </div>
    </div>
  );
};

// ── Always-visible star counter ──────────────────────────────────────────
const StarCounter = ({ stars, bumping }: { stars: number; bumping: boolean }) => (
  <div
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl font-black text-white"
    style={{ background: 'rgba(253,211,77,0.2)', border: '1.5px solid rgba(253,211,77,0.4)' }}
  >
    <span className="text-xl">⭐</span>
    <span
      className={`text-lg text-yellow-300 transition-all ${bumping ? 'counter-bump' : ''}`}
      key={bumping ? `bump-${stars}` : stars}
    >
      {stars}
    </span>
  </div>
);

// ── Floating +pts label that fades upward ────────────────────────────────
const FloatingPts = ({ pts, onDone }: { pts: number; onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <span className="absolute right-2 -top-4 text-yellow-400 font-black text-sm float-up-fade pointer-events-none select-none">
      +{pts}⭐
    </span>
  );
};

// ── Main component ───────────────────────────────────────────────────────
const KidHeroView = () => {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [starsBumping, setStarsBumping] = useState(false);
  const [celebrating, setCelebrating] = useState<{ pts: number } | null>(null);
  const [floatingPts, setFloatingPts] = useState<{ dutyId: string; pts: number } | null>(null);
  const celebTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { t } = useTranslation();

  const loadDuties = useCallback(() => {
    if (!user?.id) return;
    apiClient.get(`/duties/today/${user.id}`)
      .then(data => setDuties(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const loadStars = useCallback(() => {
    if (!user?.id) return;
    apiClient.get(`/rewards/kid/${user.id}`)
      .then((d: any) => setTotalStars(d.availablePoints ?? 0))
      .catch(() => {/* stay at 0 */});
  }, [user?.id]);

  useEffect(() => { loadDuties(); loadStars(); }, [loadDuties, loadStars]);

  const handleSubmit = async (duty: Duty) => {
    const pts = duty.template.defaultPoints;
    try {
      await apiClient.post(`/duties/${duty.id}/submit`);
      setDuties(prev => prev.map(d => d.id === duty.id ? { ...d, status: 'SUBMITTED' } : d));

      // Floating +pts on card
      setFloatingPts({ dutyId: duty.id, pts });

      // Bump star counter optimistically
      setTotalStars(s => s + pts);
      setStarsBumping(true);
      setTimeout(() => setStarsBumping(false), 600);

      // Full-screen celebration for 3s
      setCelebrating({ pts });
      if (celebTimerRef.current) clearTimeout(celebTimerRef.current);
      celebTimerRef.current = setTimeout(() => setCelebrating(null), 3000);
    } catch {
      alert('Failed to submit duty.');
    }
  };

  const avatarEmoji = AVATAR_EMOJI[user?.avatarSlug ?? ''] ?? AVATAR_EMOJI.default;
  const done  = duties.filter(d => d.status === 'SUBMITTED' || d.status === 'APPROVED').length;
  const total = duties.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

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

      {/* ── Celebration overlay ────────────────────────────────────── */}
      {celebrating && <Confetti points={celebrating.pts} />}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex justify-between items-start">
          {/* Avatar + name */}
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

          {/* Right side controls + star counter */}
          <div className="flex flex-col items-end gap-2 mt-1">
            <StarCounter stars={totalStars} bumping={starsBumping} />
            <div className="flex gap-2">
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
        </div>

        {/* ── Progress bar ──────────────────────────────────────────── */}
        <div className="mt-6 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-white/80 text-sm font-semibold">{t('kid.progress_label')}</span>
            <span className="text-yellow-400 font-black text-lg">{done}/{total}</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ffd93d,#f093fb,#f5576c)' }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2">
            {pct === 100 ? t('kid.all_done') : `${100 - pct}${t('kid.to_go')}`}
          </p>
        </div>
      </div>

      {/* ── Missions list ─────────────────────────────────────────── */}
      <div className="px-5 pb-10">
        <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
          {t('kid.missions_label')}
        </h2>
        <div className="space-y-3">
          {duties.length === 0 ? (
            <div className="rounded-3xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-white text-xl font-black">{t('kid.no_duties')}</p>
              <p className="text-white/50 mt-1">{t('kid.no_duties_sub')}</p>
            </div>
          ) : duties.map((duty, i) => {
            const isComplete = duty.status === 'SUBMITTED' || duty.status === 'APPROVED';
            const isFloating = floatingPts?.dutyId === duty.id;
            return (
              <div
                data-testid="duty-card"
                key={duty.id}
                className="relative rounded-2xl p-5 flex items-center gap-4 transition-all"
                style={{
                  background: isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                  border: isComplete ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {/* Floating +pts label */}
                {isFloating && (
                  <FloatingPts pts={floatingPts!.pts} onDone={() => setFloatingPts(null)} />
                )}

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: isComplete ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)' }}>
                  {isComplete ? '✅' : getDutyEmoji(duty.template.name)}
                </div>

                {/* Name + points */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
                    {duty.template.name}
                  </p>
                  <p className="text-yellow-400 text-sm font-semibold">+{duty.template.defaultPoints} ⭐</p>
                </div>

                {/* Done button / status badge */}
                {!isComplete ? (
                  <button
                    data-testid="btn-done"
                    onClick={() => handleSubmit(duty)}
                    className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-sm text-white transition-transform active:scale-95 select-none"
                    style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)', boxShadow: '0 4px 16px rgba(240,147,251,0.4)' }}
                  >
                    {t('kid.btn_done')}
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-emerald-400 text-sm font-bold">
                    {duty.status === 'APPROVED' ? '✅ Approved!' : t('kid.status_submitted')}
                  </span>
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
