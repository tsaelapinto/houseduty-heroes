import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

interface Kid {
  id: string;
  name: string;
  avatarSlug: string;
  householdId: string;
}

const AVATAR_EMOJI: Record<string, string> = {
  'strawberry-elephant': '🐘',
  'ballerina-capuchina': '🩰',
  'disco-panda': '🐼',
  'super-rocket': '🚀',
  'ninja-turtle': '🐢',
  'robo-cat': '🤖',
  default: '⭐',
};

const AVATAR_BG: Record<string, string> = {
  'strawberry-elephant': 'from-pink-400 to-rose-500',
  'ballerina-capuchina': 'from-purple-400 to-pink-500',
  'disco-panda': 'from-slate-500 to-slate-700',
  'super-rocket': 'from-orange-400 to-red-500',
  'ninja-turtle': 'from-green-400 to-emerald-600',
  'robo-cat': 'from-blue-400 to-indigo-600',
  default: 'from-indigo-400 to-purple-600',
};

/** Read the persisted household ID — survives logout */
function getStoredHouseholdId(): string | null {
  const explicit = localStorage.getItem('knownHouseholdId');
  if (explicit) return explicit;
  const user = localStorage.getItem('user');
  return user ? (JSON.parse(user)?.householdId ?? null) : null;
}

export default function KidSelectorScreen() {
  const [householdId, setHouseholdId] = useState<string | null>(getStoredHouseholdId);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    apiClient.get(`/kids?householdId=${householdId}`)
      .then((data) => setKids(data))
      .catch(() => setKids([]))
      .finally(() => setLoading(false));
  }, [householdId]);

  const handleEnterCode = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setCodeError('');
    try {
      const data = await apiClient.get(`/kids?householdId=${encodeURIComponent(code)}`);
      localStorage.setItem('knownHouseholdId', code);
      setHouseholdId(code);
      setKids(data);
    } catch {
      setCodeError('Family code not found. Ask a parent for the code.');
    }
  };

  const handlePinDigit = (d: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
    setError('');
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleLogin = async () => {
    if (!selectedKid || pin.length < 4) return;
    setLoginLoading(true);
    setError('');
    try {
      const data = await apiClient.post('/auth/login', {
        kidId: selectedKid.id,   // secure: look up by ID, not name
        pin,
        role: 'KID',
      });
      setAuth(data.user, data.token);
      navigate('/app');
    } catch {
      setError(t('kidSelector.wrong_pin'));
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoginLoading(false);
    }
  };

  // Auto-submit when 4+ digits entered and Enter-like behaviour
  useEffect(() => {
    if (pin.length >= 4 && selectedKid && !loginLoading) {
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // ── No household known yet → ask for family code ──────────────────────
  if (!householdId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8"
        style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-2xl font-black text-white mb-2">Enter Family Code</h1>
        <p className="text-white/50 text-sm text-center mb-8">Ask a parent for your family's code to get started</p>
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnterCode()}
          placeholder="Paste or type family code…"
          className="w-full max-w-sm px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 mb-3 text-center font-mono text-sm"
        />
        {codeError && <p className="text-red-400 text-sm mb-3">{codeError}</p>}
        <button
          onClick={handleEnterCode}
          className="w-full max-w-sm py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition mb-4"
        >
          Let's go
        </button>
        <button onClick={() => navigate('/login')} className="text-white/40 text-sm hover:text-white/70 transition">
          Parent login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
        <div className="text-white text-center animate-pulse">
          <div className="text-6xl mb-4">🦸</div>
          <p className="text-xl font-bold">{t('kidSelector.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center relative">
        <div className="absolute top-4 end-4"><LanguageToggle /></div>
        <div className="text-5xl mb-3">🏠</div>
        <h1 className="text-3xl font-black text-white">{t('kidSelector.title')}</h1>
        <p className="text-white/50 mt-1 text-sm">{t('kidSelector.subtitle')}</p>
      </div>

      {/* Kids grid */}
      {!selectedKid ? (
        <div className="flex-1 px-6">
          {kids.length === 0 ? (
            <div className="text-center mt-16 text-white/40">
              <div className="text-5xl mb-4">😕</div>
              <p className="font-semibold">{t('kidSelector.empty_title')}</p>
              <p className="text-sm mt-1">{t('kidSelector.empty_sub')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {kids.map((kid) => {
                const emoji = AVATAR_EMOJI[kid.avatarSlug] ?? AVATAR_EMOJI.default;
                const bg = AVATAR_BG[kid.avatarSlug] ?? AVATAR_BG.default;
                return (
                  <button
                    key={kid.id}
                    onClick={() => { setSelectedKid(kid); setPin(''); setError(''); }}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-br ${bg} shadow-xl active:scale-95 transition-transform`}
                  >
                    <span className="text-6xl mb-3">{emoji}</span>
                    <span className="text-white font-black text-lg">{kid.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-8 py-3 text-white/40 text-sm font-medium hover:text-white/70 transition"
          >
            {t('kidSelector.parent_link')}
          </button>
        </div>
      ) : (
        /* PIN Pad */
        <div className="flex-1 flex flex-col items-center px-6">
          <button
            onClick={() => { setSelectedKid(null); setPin(''); setError(''); }}
            className="mb-6 text-white/50 hover:text-white text-sm font-medium transition flex items-center gap-1"
          >
            {t('back')}
          </button>

          {/* Avatar */}
          <div className={`w-24 h-24 rounded-3xl mb-4 flex items-center justify-center text-5xl bg-gradient-to-br ${AVATAR_BG[selectedKid.avatarSlug] ?? AVATAR_BG.default} shadow-2xl`}>
            {AVATAR_EMOJI[selectedKid.avatarSlug] ?? AVATAR_EMOJI.default}
          </div>
          <h2 className="text-white text-2xl font-black mb-1">{selectedKid.name}</h2>
          <p className="text-white/50 text-sm mb-8">{t('kidSelector.enter_pin')}</p>

          {/* PIN dots */}
          <div className={`flex gap-4 mb-6 ${shake ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  i < pin.length ? 'bg-white border-white scale-110' : 'bg-transparent border-white/40'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-400 text-sm font-bold mb-4">{error}</p>}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <button key={d} onClick={() => handlePinDigit(d)}
                className="aspect-square rounded-2xl text-2xl font-black text-white transition active:scale-90"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                {d}
              </button>
            ))}
            <div /> {/* empty slot */}
            <button onClick={() => handlePinDigit('0')}
              className="aspect-square rounded-2xl text-2xl font-black text-white transition active:scale-90"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              0
            </button>
            <button onClick={handleDelete}
              className="aspect-square rounded-2xl text-2xl font-black text-white transition active:scale-90"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              ⌫
            </button>
          </div>

          {loginLoading && (
            <div className="mt-8 flex items-center gap-3 text-white/60">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('kidSelector.checking')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
