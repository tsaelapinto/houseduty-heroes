import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

interface UnlockableItem {
  id: string;
  type: string;
  slug: string;
  label: string;
  pointsCost: number;
  isDefault: boolean;
}

interface UnlockedEntry {
  id: string;
  item: UnlockableItem;
  unlockedAt: string;
}

interface RewardsData {
  totalPoints: number;
  spentPoints: number;
  availablePoints: number;
  unlocks: UnlockedEntry[];
  catalogue: UnlockableItem[];
}

const TYPE_EMOJI: Record<string, string> = {
  AVATAR: '🎭',
  STICKER: '✨',
  THEME: '🎨',
  TITLE: '🏆',
};

export default function RewardsShopScreen() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const TYPE_LABEL: Record<string, string> = {
    AVATAR: t('rewards.type_avatar'),
    STICKER: t('rewards.type_sticker'),
    THEME: t('rewards.type_theme'),
    TITLE: t('rewards.type_title'),
  };

  const fetchRewards = () => {
    if (!user?.id) return;
    apiClient.get(`/rewards/kid/${user.id}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRewards(); }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUnlock = async (item: UnlockableItem) => {
    if (!user?.id || unlocking) return;
    setUnlocking(item.id);
    try {
      await apiClient.post('/rewards/unlock', { kidId: user.id, itemId: item.id });
      showToast(`🎉 Unlocked: ${item.label}!`);
      fetchRewards();
    } catch (err: any) {
      showToast(`❌ ${err.message || 'Could not unlock'}`);
    } finally {
      setUnlocking(null);
    }
  };

  const isUnlocked = (itemId: string) => data?.unlocks.some((u) => u.item.id === itemId) ?? false;

  // Group catalogue by type
  const grouped = data?.catalogue.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, UnlockableItem[]>) ?? {};

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/app')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            ←
          </button>
          <div>
            <h1 className="text-white text-2xl font-black">{t('rewards.title')}</h1>
            <p className="text-white/50 text-sm">Spend your hard-earned stars</p>
          </div>
          <div className="ms-auto"><LanguageToggle /></div>
        </div>

        {/* Points banner */}
        {data && (
          <div className="rounded-3xl p-5 mb-2"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,87,108,0.2))', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400/80 text-xs font-bold uppercase tracking-wider">{t('rewards.available')}</p>
                <p className="text-yellow-400 text-4xl font-black mt-1">⭐ {data.availablePoints}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs">{t('rewards.total')}</p>
                <p className="text-white/60 font-bold">{data.totalPoints} ⭐</p>
                <p className="text-white/40 text-xs mt-1">{t('rewards.spent')}</p>
                <p className="text-white/60 font-bold">{data.spentPoints} ⭐</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Catalogue */}
      <div className="px-5 pb-20">
        {loading ? (
          <div className="text-center py-20 animate-pulse">
            <div className="text-5xl mb-3">✨</div>
            <p className="text-white/50">Loading rewards…</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="text-white/50 font-semibold">No items in the shop yet.</p>
            <p className="text-white/30 text-sm mt-1">Ask your parent to add rewards!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-8">
              <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">
                {TYPE_EMOJI[type] ?? '🎁'} {TYPE_LABEL[type] ?? type}
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const unlocked = isUnlocked(item.id);
                  const canAfford = (data?.availablePoints ?? 0) >= item.pointsCost;
                  return (
                    <div key={item.id}
                      className="flex items-center gap-4 rounded-2xl p-4 transition"
                      style={{
                        background: unlocked
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(255,255,255,0.07)',
                        border: unlocked
                          ? '1px solid rgba(16,185,129,0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                      }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {TYPE_EMOJI[item.type] ?? '🎁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${unlocked ? 'text-emerald-400' : 'text-white'}`}>
                          {item.label}
                        </p>
                        <p className="text-yellow-400 text-sm font-semibold mt-0.5">
                          {unlocked ? t('rewards.unlocked_badge') : `⭐ ${item.pointsCost} stars`}
                        </p>
                      </div>
                      {!unlocked && (
                        <button
                          onClick={() => handleUnlock(item)}
                          disabled={!canAfford || !!unlocking}
                          className="flex-shrink-0 px-4 py-2 rounded-xl font-black text-sm transition active:scale-95 disabled:opacity-40"
                          style={{
                            background: canAfford
                              ? 'linear-gradient(135deg, #f093fb, #f5576c)'
                              : 'rgba(255,255,255,0.1)',
                            color: 'white',
                          }}
                        >
                          {unlocking === item.id ? t('rewards.btn_unlocking') : canAfford ? t('rewards.btn_unlock') : `Need ${item.pointsCost}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl font-bold text-white text-sm shadow-2xl z-50 transition-all"
          style={{ background: 'rgba(30,30,60,0.95)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
