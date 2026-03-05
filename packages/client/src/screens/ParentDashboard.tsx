import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

interface DutyInstance { id: string; status: string; template?: { name: string; defaultPoints: number }; }
interface Kid { id: string; name: string; avatarSlug: string; dutyInstances: DutyInstance[]; morningReminderTime?: string | null; eveningReminderTime?: string | null; }
interface Template { id: string; name: string; defaultPoints: number; recurrence: string; }
interface CycleInstance { id: string; status: string; date: string; pointsOverride?: number; template?: { name: string; defaultPoints: number }; }
interface CycleDay { date: string; duties: CycleInstance[]; }
interface KidSummary { kidId: string; kidName: string; avatarSlug: string; totalPoints: number; approved: number; total: number; }
interface CycleData { id: string; startAt: string; endAt: string; status: string; kidSummaries: KidSummary[]; }
interface CycleReport { id: string; startAt: string; endAt: string; kidSummaries: KidSummary[]; }
interface HeroDetail { kid: { id: string; name: string; avatarSlug: string }; cycle: CycleData | null; days: CycleDay[]; }

const AVATAR_EMOJI: Record<string, string> = {
  'strawberry-elephant': '🐘', 'ballerina-capuchina': '🩰',
  'disco-panda': '🐼', 'super-rocket': '🚀', 'ninja-turtle': '🐢', 'robo-cat': '🤖', default: '⭐',
};
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-amber-100 text-amber-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
};
const AVATARS = [
  { slug: 'strawberry-elephant', emoji: '🐘' }, { slug: 'ballerina-capuchina', emoji: '🩰' },
  { slug: 'disco-panda', emoji: '🐼' }, { slug: 'super-rocket', emoji: '🚀' },
  { slug: 'ninja-turtle', emoji: '🐢' }, { slug: 'robo-cat', emoji: '🤖' },
];

const DUTY_EMOJI: Record<string, string> = {
  'Kitchen': '🍽️', 'Dishes': '🍽️', 'Laundry': '👕', 'Table': '🪑',
  'Dog': '🐶', 'Bed': '🛏️', 'Sweep': '🧹', 'Feed': '🐾', 'Clear': '🧹',
  'Make': '🛏️', default: '📋',
};
const getDutyEmoji = (name: string) => {
  const found = Object.entries(DUTY_EMOJI).find(([k]) => k !== 'default' && name.toLowerCase().includes(k.toLowerCase()));
  return found ? found[1] : DUTY_EMOJI.default;
};

const RECURRENCE_OPTIONS = ['daily', 'weekdays', 'weekends', '3x', '2x', 'weekly'];

const RecurrenceBadge = ({ r }: { r: string }) => {
  const { t } = useTranslation();
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 font-medium whitespace-nowrap">
      {t(`parent.recurrence.${r}`, { defaultValue: r })}
    </span>
  );
};

const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-medium";

// ── Modal wrapper ──────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-black text-slate-800">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition">✕</button>
      </div>
      {children}
    </div>
  </div>
);

const ParentDashboard = () => {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Add Kid modal state
  const [showAddKid, setShowAddKid] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidPin, setKidPin] = useState('');
  const [kidAvatar, setKidAvatar] = useState('super-rocket');
  const [addKidError, setAddKidError] = useState('');
  const [addKidLoading, setAddKidLoading] = useState(false);

  // Assign Duty modal state
  const [assignTarget, setAssignTarget] = useState<Kid | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Family code copy state
  const [codeCopied, setCodeCopied] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);

  // PIN reset modal state
  const [pinResetTarget, setPinResetTarget] = useState<any>(null);
  const [pinResetValue, setPinResetValue] = useState('');
  const [pinResetConfirm, setPinResetConfirm] = useState('');
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinResetError, setPinResetError] = useState('');

  // Invite partner modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailName, setInviteEmailName] = useState('');
  const [inviteEmailLoading, setInviteEmailLoading] = useState(false);
  const [inviteEmailDone, setInviteEmailDone] = useState(false);

  // Duty Library modal state
  const [showDutyLibrary, setShowDutyLibrary] = useState(false);
  const [libTemplates, setLibTemplates] = useState<Template[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [newDutyName, setNewDutyName] = useState('');
  const [newDutyPoints, setNewDutyPoints] = useState('10');
  const [newDutyRecurrence, setNewDutyRecurrence] = useState('daily');
  const [newDutyError, setNewDutyError] = useState('');

  // Reminder modal state
  const [reminderTarget, setReminderTarget] = useState<any>(null);
  const [morningTime, setMorningTime] = useState('');
  const [eveningTime, setEveningTime] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);

  // Hero detail (cycle drilldown) state
  const [heroDetail, setHeroDetail] = useState<HeroDetail | null>(null);
  const [heroDetailLoading, setHeroDetailLoading] = useState(false);

  // Delete hero state
  const [deleteTarget, setDeleteTarget] = useState<Kid | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cycle panel state
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleStartDays, setCycleStartDays] = useState(7);
  const [startingCycle, setStartingCycle] = useState(false);
  const [closingCycle, setClosingCycle] = useState(false);
  const [cycleHistory, setCycleHistory] = useState<CycleReport[]>([]);
  const [showCycleReport, setShowCycleReport] = useState<CycleReport | null>(null);

  // Editable household name state
  const [householdName, setHouseholdName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPoints, setEditPoints] = useState('10');
  const [editRecurrence, setEditRecurrence] = useState('daily');

  const refreshKids = useCallback(() => {
    setLoading(true);
    apiClient.get(`/kids?householdId=${user?.householdId ?? ''}`)
      .then(setKids)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.householdId]);

  useEffect(() => { refreshKids(); }, [refreshKids]);

  // Load active cycle + household name on mount
  const refreshCycle = useCallback(async () => {
    if (!user?.householdId) return;
    setCycleLoading(true);
    try {
      const data = await apiClient.get(`/cycles/active?householdId=${user.householdId}`);
      setCycleData(data);
    } catch { setCycleData(null); }
    finally { setCycleLoading(false); }
  }, [user?.householdId]);

  useEffect(() => { refreshCycle(); }, [refreshCycle]);

  useEffect(() => {
    if (!user?.householdId) return;
    apiClient.get(`/household?householdId=${user.householdId}`)
      .then((h: any) => setHouseholdName(h.name))
      .catch(() => {});
  }, [user?.householdId]);

  const loadTemplates = async () => {
    const data = await apiClient.get(`/duties/templates?householdId=${user?.householdId ?? ''}`);
    return data as Template[];
  };

  // Open assign modal: load templates
  const openAssign = async (kid: Kid) => {
    setAssignTarget(kid);
    setSelectedTemplate('');
    setAssignError('');
    try { setTemplates(await loadTemplates()); } catch { setTemplates([]); }
  };

  const openDutyLibrary = async () => {
    setShowDutyLibrary(true);
    setNewDutyName(''); setNewDutyPoints('10'); setNewDutyError('');
    setLibLoading(true);
    try { setLibTemplates(await loadTemplates()); } catch { setLibTemplates([]); }
    finally { setLibLoading(false); }
  };

  const handleCreateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDutyName.trim()) return;
    setNewDutyError('');
    try {
      const created = await apiClient.post('/duties/templates', {
        householdId: user?.householdId,
        name: newDutyName.trim(),
        defaultPoints: parseInt(newDutyPoints) || 10,
        recurrence: newDutyRecurrence,
      });
      setLibTemplates(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDutyName(''); setNewDutyPoints('10'); setNewDutyRecurrence('daily');
    } catch (err: any) { setNewDutyError(err.message || 'Failed to create duty'); }
  };

  const handleSaveDuty = async () => {
    if (!editingId) return;
    try {
      const updated = await apiClient.patch(`/duties/templates/${editingId}`, {
        name: editName.trim(),
        defaultPoints: parseInt(editPoints) || 10,
        recurrence: editRecurrence,
      });
      setLibTemplates(prev =>
        prev.map(t => t.id === editingId ? updated : t).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteDuty = async (id: string) => {
    try {
      await apiClient.delete(`/duties/templates/${id}`);
      setLibTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddKidError('');
    setAddKidLoading(true);
    try {
      await apiClient.post('/auth/add-kid', {
        name: kidName, pin: kidPin, avatarSlug: kidAvatar,
        householdId: user?.householdId,
      });
      setShowAddKid(false);
      setKidName(''); setKidPin(''); setKidAvatar('super-rocket');
      refreshKids();
    } catch (err: any) { setAddKidError(err.message || 'Failed to add hero'); }
    finally { setAddKidLoading(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !assignTarget) return;
    setAssignError('');
    setAssignLoading(true);
    try {
      await apiClient.post('/duties/assign', {
        kidId: assignTarget.id, templateId: selectedTemplate,
        householdId: user?.householdId,
      });
      setAssignTarget(null);
      refreshKids();
    } catch (err: any) { setAssignError(err.message || 'Failed to assign duty'); }
    finally { setAssignLoading(false); }
  };

  const handleSendInviteEmail = async () => {
    if (!inviteEmail.trim()) return;
    setInviteEmailLoading(true);
    setInviteEmailDone(false);
    try {
      const data = await apiClient.post('/invite', {
        partnerEmail: inviteEmail.trim(),
        partnerName: inviteEmailName.trim() || undefined,
      });
      setInviteUrl(data.url);
      if (data.emailSent) setInviteEmailDone(true);
      else alert('Email could not be sent — RESEND_API_KEY may not be configured on the server. Share the link manually.');
    } catch (err: any) {
      alert('Failed: ' + (err.message ?? 'unknown error'));
    } finally {
      setInviteEmailLoading(false);
    }
  };

  const handleOpenInvite = async () => {
    setShowInviteModal(true);
    if (inviteUrl) return; // already generated
    setInviteLoading(true);
    try {
      const data = await apiClient.post('/invite', {});
      setInviteUrl(data.url);
    } catch (err: any) {
      console.error('Failed to generate invite', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetTarget) return;
    if (pinResetValue.length < 4) { setPinResetError('PIN must be at least 4 digits'); return; }
    if (pinResetValue !== pinResetConfirm) { setPinResetError('PINs do not match'); return; }
    setPinResetLoading(true);
    setPinResetError('');
    try {
      await apiClient.patch(`/kids/${pinResetTarget.id}/pin`, {
        newPin: pinResetValue,
        householdId: user?.householdId,
      });
      setPinResetTarget(null);
      setPinResetValue('');
      setPinResetConfirm('');
    } catch (err: any) {
      setPinResetError(err.message || 'Failed to reset PIN');
    } finally {
      setPinResetLoading(false);
    }
  };

  const handleUpdateReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTarget) return;
    setReminderLoading(true);
    try {
      await apiClient.patch(`/kids/${reminderTarget.id}/reminders`, {
        morningReminderTime: morningTime,
        eveningReminderTime: eveningTime,
        householdId: user?.householdId,
      });
      setReminderTarget(null);
      refreshKids();
    } catch (err) {
      console.error(err);
      alert('Failed to update reminders');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  };

  const handleApprove = async (dutyId: string) => {
    try {
      await apiClient.post(`/duties/${dutyId}/approve`, { parentId: user?.id });
      refreshKids();
    } catch (err) { console.error(err); }
  };

  const handleDeleteHero = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.deleteBody(`/kids/${deleteTarget.id}`, { householdId: user?.householdId });
      setDeleteTarget(null);
      refreshKids();
    } catch (err: any) { alert(err.message || 'Failed to remove hero'); }
    finally { setDeleteLoading(false); }
  };

  const openHeroDetail = async (kid: Kid) => {
    setHeroDetailLoading(true);
    setHeroDetail(null);
    try {
      const data = await apiClient.get(`/kids/${kid.id}/cycle-detail?householdId=${user?.householdId ?? ''}`);
      setHeroDetail(data);
    } catch { setHeroDetail(null); }
    finally { setHeroDetailLoading(false); }
  };

  const handleStartCycle = async () => {
    if (!user?.householdId) return;
    setStartingCycle(true);
    try {
      await apiClient.post('/cycles/start', { householdId: user.householdId, durationDays: cycleStartDays });
      await refreshCycle();
      refreshKids();
    } catch (err: any) { alert(err.message || 'Failed to start cycle'); }
    finally { setStartingCycle(false); }
  };

  const handleCloseCycle = async () => {
    if (!user?.householdId) return;
    setClosingCycle(true);
    try {
      // Load history before closing so we can show report
      const history = await apiClient.get(`/cycles/history?householdId=${user.householdId}`);
      await apiClient.post('/cycles/close', { householdId: user.householdId });
      const fresh = await apiClient.get(`/cycles/history?householdId=${user.householdId}`);
      setCycleHistory(fresh);
      // Show report for the cycle that was just closed (first in fresh history)
      if (fresh.length > 0) setShowCycleReport(fresh[0]);
      setCycleData(null);
      refreshKids();
    } catch (err: any) { alert(err.message || 'Failed to end cycle'); }
    finally { setClosingCycle(false); }
  };

  const loadCycleHistory = async () => {
    if (!user?.householdId) return;
    const data = await apiClient.get(`/cycles/history?householdId=${user.householdId}`);
    setCycleHistory(data);
  };

  const handleSaveHouseholdName = async () => {
    if (!editNameVal.trim()) return;
    setSavingName(true);
    try {
      const updated = await apiClient.patch('/household', { householdId: user?.householdId, name: editNameVal.trim() });
      setHouseholdName((updated as any).name);
      setEditingName(false);
    } catch (err: any) { alert(err.message || 'Failed to rename'); }
    finally { setSavingName(false); }
  };

  const totalPending = kids.reduce((s, k) => s + k.dutyInstances.filter(d => d.status === 'SUBMITTED').length, 0);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🏠</div>
        <p className="text-slate-500 font-semibold">{t('parent.loading')}</p>
      </div>
    </div>
  );

  return (
    <div data-testid="parent-dashboard" className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">🏠</span>
            <div className="hidden sm:block">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    className="text-xs font-medium border border-indigo-300 rounded-lg px-2 py-0.5 bg-white focus:outline-none w-28"
                    value={editNameVal}
                    onChange={e => setEditNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveHouseholdName(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                  />
                  <button onClick={handleSaveHouseholdName} disabled={savingName}
                    className="text-xs px-2 py-0.5 rounded-lg bg-indigo-500 text-white font-bold disabled:opacity-50">
                    {savingName ? '…' : '✓'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-xs px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500">✕</button>
                </div>
              ) : (
                <button
                  className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-500 transition group leading-none"
                  onClick={() => { setEditNameVal(householdName); setEditingName(true); }}
                >
                  <span>{householdName || t('parent.console_label')}</span>
                  <span className="opacity-0 group-hover:opacity-100">✏️</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable action row */}
          <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {/* Family Code */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1.5 border border-slate-200 shrink-0">
              <span className="text-xs">🔑</span>
              <button
                onClick={() => setShowFullCode((v) => !v)}
                className="font-mono text-xs text-slate-600 hover:text-indigo-600 transition cursor-pointer"
              >
                {showFullCode ? user?.householdId : `${user?.householdId?.slice(0, 8)}…`}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user?.householdId ?? '');
                  setCodeCopied(true);
                  setShowFullCode(true);
                  setTimeout(() => setCodeCopied(false), 2500);
                }}
                className={`ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-lg transition ${
                  codeCopied ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
              >
                {codeCopied ? '✓' : t('parent.copy') || 'Copy'}
              </button>
            </div>

            <button data-testid="btn-add-hero" onClick={() => { setShowAddKid(true); setAddKidError(''); }}
              className="text-sm px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow hover:opacity-90 transition shrink-0">
              + {t('parent.add_hero')}
            </button>
            <button onClick={openDutyLibrary}
              className="text-sm px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition shrink-0">
              📋
            </button>
            <button onClick={() => navigate('/assign')} data-testid="btn-assign-screen"
              className="text-sm px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition shrink-0">
              📈
            </button>
            <LanguageToggle />
            <button onClick={handleOpenInvite} data-testid="btn-invite-partner"
              className="text-sm px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition shrink-0 hidden sm:block">
              {t('invite.btn')}
            </button>
          </div>
          {/* Logout pinned outside scrollable so it's always visible in both LTR and RTL */}
          <button onClick={logout} data-testid="btn-logout"
            className="text-sm px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 font-medium transition shrink-0">
            {t('parent.logout')}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: t('parent.heroes_tab'), value: kids.length, icon: '🦸', color: 'from-indigo-500 to-purple-600' },
            { label: t('parent.awaiting_review'), value: totalPending, icon: '⏳', color: 'from-amber-400 to-orange-500' },
            { label: t('parent.total_duties'), value: kids.reduce((s, k) => s + k.dutyInstances.length, 0), icon: '✅', color: 'from-emerald-400 to-teal-500' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-3 md:p-5 text-white card-shadow`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black">{stat.value}</div>
              <div className="text-white/70 text-xs font-medium mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Heroes grid */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('parent.heroes_tab')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kids.map(kid => {
            const pending = kid.dutyInstances.filter(d => d.status === 'ASSIGNED').length;
            const submitted = kid.dutyInstances.filter(d => d.status === 'SUBMITTED').length;
            const approved = kid.dutyInstances.filter(d => d.status === 'APPROVED').length;
            const total = kid.dutyInstances.length;
            const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
            const avatar = AVATAR_EMOJI[kid.avatarSlug] ?? AVATAR_EMOJI.default;
            return (
              <div key={kid.id} data-testid="kid-card" className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
                <button
                  className="flex items-center gap-4 mb-4 text-left hover:opacity-80 transition group"
                  onClick={() => openHeroDetail(kid)}
                  title="View cycle detail"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl flex-shrink-0">{avatar}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition">{kid.name}</h3>
                    <p className="text-sm text-slate-400">{total} {t('parent.duties_today')}</p>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-400 text-sm">→</span>
                </button>

                {/* Status badges */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {pending > 0 && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS.ASSIGNED}`}>⏳ {pending} {t('parent.status_pending_badge')}</span>}
                  {submitted > 0 && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS.SUBMITTED}`}>📬 {submitted} {t('parent.status_review_badge')}</span>}
                  {approved > 0 && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS.APPROVED}`}>✅ {approved} {t('parent.status_done_badge')}</span>}
                  {total === 0 && <span className="text-xs text-slate-400">{t('parent.no_duties_yet')}</span>}
                </div>

                {/* Submitted duties to approve */}
                {kid.dutyInstances.filter(d => d.status === 'SUBMITTED').map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2 mb-2 text-sm">
                    <span>{d.template ? getDutyEmoji(d.template.name) : '📋'} <span className="font-semibold">{d.template?.name ?? 'Duty'}</span></span>
                    <button onClick={() => handleApprove(d.id)} className="ml-2 px-3 py-1 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition">{t('parent.approve')} ✅</button>
                  </div>
                ))}

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4 mt-auto">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex gap-2">
                  <button data-testid="btn-assign-duty" onClick={() => openAssign(kid)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition shadow">
                    + {t('parent.assign_duty')}
                  </button>
                  <button
                    onClick={() => { setReminderTarget(kid); setMorningTime(kid.morningReminderTime || ''); setEveningTime(kid.eveningReminderTime || ''); }}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-yellow-100 hover:text-yellow-600 transition"
                    title="Reminders"
                  >
                    🔔
                  </button>
                  <button
                    onClick={() => { setPinResetTarget(kid); setPinResetValue(''); setPinResetConfirm(''); setPinResetError(''); }}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 transition"
                    title="Reset PIN"
                  >
                    🔐
                  </button>
                  <button
                    onClick={() => setDeleteTarget(kid)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 transition"
                    title="Remove hero"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Hero card */}
          <div data-testid="add-hero-card" onClick={() => { setShowAddKid(true); setAddKidError(''); }}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40 cursor-pointer transition-all">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-3">➕</div>
            <p className="font-bold text-sm">{t('parent.modal_add_hero')}</p>
            <p className="text-xs mt-1">{t('parent.register_kid')}</p>
          </div>
        </div>

        {/* Cycle Panel — below heroes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-6 mb-4 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-700">🔄 Current Cycle</h2>
            {cycleHistory.length === 0 && !cycleLoading && (
              <button onClick={loadCycleHistory} className="text-xs text-indigo-500 hover:underline">View History</button>
            )}
            {cycleHistory.length > 0 && (
              <button onClick={() => setShowCycleReport(cycleHistory[0])} className="text-xs text-indigo-500 hover:underline">📊 Last Report</button>
            )}
          </div>

          {cycleLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : cycleData ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                <span className="text-slate-500 text-xs">
                  {new Date(cycleData.startAt).toLocaleDateString()} → {new Date(cycleData.endAt).toLocaleDateString()}
                </span>
                {(() => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(cycleData.endAt).getTime() - Date.now()) / 86400000));
                  const totalDays = Math.ceil((new Date(cycleData.endAt).getTime() - new Date(cycleData.startAt).getTime()) / 86400000);
                  const pct = Math.round(100 - (daysLeft / totalDays) * 100);
                  return (
                    <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                      <div className="h-1.5 bg-slate-100 rounded-full flex-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{daysLeft}d left</span>
                    </div>
                  );
                })()}
              </div>
              {cycleData.kidSummaries && cycleData.kidSummaries.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {cycleData.kidSummaries.map(ks => (
                    <div key={ks.kidId} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1 text-xs">
                      <span>{AVATAR_EMOJI[ks.avatarSlug] ?? AVATAR_EMOJI.default}</span>
                      <span className="font-bold text-slate-700">{ks.kidName}</span>
                      <span className="text-emerald-600 font-bold">⭐{ks.totalPoints}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleCloseCycle} disabled={closingCycle}
                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 font-bold text-xs hover:bg-red-100 transition disabled:opacity-50">
                {closingCycle ? 'Ending…' : '🏁 End Cycle & See Report'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-400 flex-1">No active cycle yet.</p>
              <select value={cycleStartDays} onChange={e => setCycleStartDays(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-white text-slate-700">
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <button onClick={handleStartCycle} disabled={startingCycle}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs shadow hover:opacity-90 transition disabled:opacity-50">
                {startingCycle ? 'Starting…' : '▶ Start Cycle'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Invite Partner Modal ──────────────────────────────────────── */}
      {showInviteModal && (
        <Modal title={`${t('invite.modal_title')}`} onClose={() => { setShowInviteModal(false); setInviteEmailDone(false); setInviteEmail(''); setInviteEmailName(''); }}>
          <p className="text-sm text-slate-500 mb-5">{t('invite.modal_desc')}</p>
          {inviteLoading ? (
            <div className="text-center py-6 text-slate-400 font-medium">{t('invite.generating')}</div>
          ) : inviteUrl ? (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 break-all text-sm text-slate-700 font-mono leading-relaxed"
                data-testid="invite-url-display">
                {inviteUrl}
              </div>
              <button onClick={handleCopyInvite}
                className="w-full py-3 rounded-xl font-bold text-white text-sm transition"
                style={{ background: inviteCopied ? '#10b981' : 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {inviteCopied ? t('invite.copied') : `📋 ${t('invite.copy')}`}
              </button>
              <p className="text-xs text-slate-400 text-center">👉 Share via WhatsApp, SMS, or send by email below</p>

              <hr className="border-slate-100 my-1" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📧 Send by Email (optional)</p>
              <input type="email" className={inputCls} placeholder="partner@example.com"
                value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteEmailDone(false); }} />
              <input type="text" className={inputCls} placeholder="Partner’s name (optional)"
                value={inviteEmailName} onChange={e => setInviteEmailName(e.target.value)} />
              {inviteEmailDone ? (
                <div className="text-center text-emerald-600 font-bold text-sm py-2">
                  ✅ Email sent to {inviteEmail}!
                </div>
              ) : (
                <button onClick={handleSendInviteEmail}
                  disabled={!inviteEmail.trim() || inviteEmailLoading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
                  {inviteEmailLoading ? 'Sending…' : '📧 Send Invite Email'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-center text-red-500 text-sm">Failed to generate link. Try again.</p>
          )}
        </Modal>
      )}

      {/* ── Add Kid Modal ───────────────────────────────────────────── */}
      {showAddKid && (
        <Modal title={`🦸 ${t('parent.modal_add_hero')}`} onClose={() => setShowAddKid(false)}>
          <form onSubmit={handleAddKid} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('parent.field_name')}</label>
              <input className={inputCls} value={kidName} onChange={e => setKidName(e.target.value)}
                placeholder="E.g. Oren" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('parent.field_pin')}</label>
              <input className={inputCls} value={kidPin} onChange={e => setKidPin(e.target.value)}
                placeholder="1234" maxLength={6} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('parent.field_avatar')}</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map(a => (
                  <button type="button" key={a.slug} onClick={() => setKidAvatar(a.slug)}
                    className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center transition ${
                      kidAvatar === a.slug ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-slate-100 hover:bg-slate-200'
                    }`}>{a.emoji}</button>
                ))}
              </div>
            </div>
            {addKidError && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">⚠️ {addKidError}</div>}
            <button data-testid="btn-submit-add-hero" type="submit" disabled={addKidLoading}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition disabled:opacity-60">
              {addKidLoading ? t('parent.adding') : `🦸 ${t('parent.btn_add_hero')}`}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Assign Duty Modal ───────────────────────────────────────── */}
      {assignTarget && (
        <Modal title={`📋 ${t('parent.modal_assign')} ${assignTarget.name}`} onClose={() => setAssignTarget(null)}>
          <form data-testid="assign-duty-modal" onSubmit={handleAssign} className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm mb-3">{t('parent.no_templates')}</p>
                <button type="button" onClick={() => { setAssignTarget(null); openDutyLibrary(); }}
                  className="text-sm px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition">
                  {t('parent.open_library')}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {templates.map(tmpl => (
                  <label key={tmpl.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition ${
                      selectedTemplate === tmpl.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                    }`}>
                    <input type="radio" name="template" className="hidden" value={tmpl.id}
                      checked={selectedTemplate === tmpl.id} onChange={() => setSelectedTemplate(tmpl.id)} />
                    <span className="text-2xl">{getDutyEmoji(tmpl.name)}</span>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">{tmpl.name}</div>
                      <div className="text-xs text-slate-400">{tmpl.defaultPoints} pts</div>
                    </div>
                    {selectedTemplate === tmpl.id && <span className="text-indigo-500 font-bold">✓</span>}
                  </label>
                ))}
              </div>
            )}
            {assignError && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">⚠️ {assignError}</div>}
            <button type="submit" disabled={assignLoading || !selectedTemplate}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition disabled:opacity-50">
              {assignLoading ? t('parent.assigning') : `📋 ${t('parent.btn_assign')}`}
            </button>
          </form>
        </Modal>
      )}
      {showDutyLibrary && (
        <Modal title={`📋 ${t('parent.modal_library')}`} onClose={() => { setShowDutyLibrary(false); setEditingId(null); }}>
          <div className="space-y-4">
            {/* Template list */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {libLoading ? (
                <p className="text-slate-400 text-sm text-center py-4">{t('parent.lib_loading')}</p>
              ) : libTemplates.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">{t('parent.lib_empty')}</p>
              ) : libTemplates.map(tmpl => editingId === tmpl.id ? (
                // ─── Inline edit mode ─────────────────────────────────────────
                <div key={tmpl.id} className="p-3 rounded-xl bg-indigo-50 border-2 border-indigo-200 space-y-2">
                  <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} placeholder={t('parent.field_new_duty')} />
                  <div className="flex gap-2">
                    <input className={inputCls} type="number" min={1} max={999} value={editPoints}
                      onChange={e => setEditPoints(e.target.value)}
                      style={{ maxWidth: 80 }} placeholder={t('parent.pts_placeholder')} />
                    <select className={inputCls + ' flex-1'} value={editRecurrence} onChange={e => setEditRecurrence(e.target.value)}>
                      {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{t(`parent.recurrence.${r}`)}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveDuty}
                      className="flex-1 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition">{t('save')}</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                // ─── Read mode ─────────────────────────────────────────────────
                <div key={tmpl.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 group">
                  <span className="text-xl">{getDutyEmoji(tmpl.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{tmpl.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{tmpl.defaultPoints} pts</span>
                      <RecurrenceBadge r={tmpl.recurrence ?? 'daily'} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingId(tmpl.id); setEditName(tmpl.name); setEditPoints(String(tmpl.defaultPoints)); setEditRecurrence(tmpl.recurrence ?? 'daily'); }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-500 flex items-center justify-center text-xs transition">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteDuty(tmpl.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-xs font-bold transition">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <hr className="border-slate-100" />

            {/* Add new duty */}
            <form onSubmit={handleCreateDuty} className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('parent.add_duty_label')}</p>
              <input className={inputCls} placeholder={t('parent.duty_placeholder')} value={newDutyName}
                onChange={e => setNewDutyName(e.target.value)} required />
              <div className="flex gap-2 items-center">
                <input className={inputCls} type="number" min={1} max={999} placeholder={t('parent.pts_placeholder')} value={newDutyPoints}
                  onChange={e => setNewDutyPoints(e.target.value)} style={{ maxWidth: 80 }} />
                <select className={inputCls + ' flex-1'} value={newDutyRecurrence} onChange={e => setNewDutyRecurrence(e.target.value)}>
                  {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{t(`parent.recurrence.${r}`)}</option>)}
                </select>
              </div>
              {newDutyError && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">⚠️ {newDutyError}</div>}
              <button type="submit" disabled={!newDutyName.trim()}
                className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition disabled:opacity-50">
                ＋ {t('parent.btn_add_duty')}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Reset PIN Modal ────────────────────────────────────────── */}
      {pinResetTarget && (
        <Modal title={`🔐 Reset PIN for ${pinResetTarget.name}`} onClose={() => setPinResetTarget(null)}>
          <form onSubmit={handleResetPin} className="space-y-5">
            <p className="text-sm text-slate-500">Set a new 4-digit PIN for <strong>{pinResetTarget.name}</strong>. They'll use this to log in.</p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className={inputCls}
                placeholder="e.g. 1234"
                value={pinResetValue}
                onChange={e => setPinResetValue(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className={inputCls}
                placeholder="Repeat PIN"
                value={pinResetConfirm}
                onChange={e => setPinResetConfirm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {pinResetError && <p className="text-red-500 text-sm">{pinResetError}</p>}
            <button type="submit" disabled={pinResetLoading}
              className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90 transition shadow-lg disabled:opacity-50">
              {pinResetLoading ? 'Saving...' : '🔐 Save New PIN'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Reminders Modal ─────────────────────────────────────────── */}
      {reminderTarget && (
        <Modal title={`🔔 Daily Reminders for ${reminderTarget.name}`} onClose={() => setReminderTarget(null)}>
          <form onSubmit={handleUpdateReminders} className="space-y-5">
            <p className="text-sm text-slate-500">Pick the times when heroes should receive mission alerts on their devices.</p>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Morning Alert (e.g. 08:00)</label>
              <input type="time" className={inputCls} value={morningTime} onChange={e => setMorningTime(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Evening Alert (e.g. 19:30)</label>
              <input type="time" className={inputCls} value={eveningTime} onChange={e => setEveningTime(e.target.value)} />
            </div>

            <button type="submit" disabled={reminderLoading}
              className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 transition shadow-lg disabled:opacity-50">
              {reminderLoading ? 'Setting...' : '✅ Set Hero Reminders'}
            </button>
            <button type="button" onClick={() => { setMorningTime(''); setEveningTime(''); }} className="w-full text-xs text-slate-400 hover:text-red-500 transition">
              Clear all reminders
            </button>
          </form>
        </Modal>
      )}

      {/* ── Delete Hero Confirm Modal ────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="🗑️ Remove Hero" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl">
              <span className="text-4xl">{AVATAR_EMOJI[deleteTarget.avatarSlug] ?? AVATAR_EMOJI.default}</span>
              <div>
                <p className="font-black text-slate-800">{deleteTarget.name}</p>
                <p className="text-xs text-slate-500">{deleteTarget.dutyInstances.length} duties today</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">This will permanently delete <strong>{deleteTarget.name}</strong> and all their duty history. This cannot be undone.</p>
            <button onClick={handleDeleteHero} disabled={deleteLoading}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 transition disabled:opacity-50">
              {deleteLoading ? 'Removing…' : `🗑️ Yes, Remove ${deleteTarget.name}`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Hero Detail / Cycle Drilldown Modal ─────────────────────── */}
      {(heroDetailLoading || heroDetail) && (
        <Modal
          title={heroDetail ? `${AVATAR_EMOJI[heroDetail.kid.avatarSlug] ?? '🦸'} ${heroDetail.kid.name} — Cycle View` : 'Loading…'}
          onClose={() => { setHeroDetail(null); setHeroDetailLoading(false); }}
        >
          {heroDetailLoading && !heroDetail ? (
            <div className="text-center py-8 text-slate-400">Loading cycle…</div>
          ) : heroDetail?.cycle === null ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No active cycle.</p>
              <p className="text-xs text-slate-300 mt-1">Start a cycle from the dashboard to see daily progress here.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              <div className="text-xs text-slate-400 mb-3">
                Cycle: {heroDetail?.cycle && new Date(heroDetail.cycle.startAt).toLocaleDateString()} – {heroDetail?.cycle && new Date(heroDetail.cycle.endAt).toLocaleDateString()}
              </div>
              {heroDetail?.days.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No duties assigned in this cycle yet.</p>
              )}
              {heroDetail?.days.map(day => {
                const date = new Date(day.date);
                const isToday = new Date().toDateString() === date.toDateString();
                const allDone = day.duties.length > 0 && day.duties.every(d => d.status === 'APPROVED');
                return (
                  <div key={day.date} className={`rounded-xl border p-3 ${isToday ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-black ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {isToday ? '📍 Today · ' : ''}{date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {allDone && <span className="text-xs text-emerald-500 font-bold">✅ Complete</span>}
                    </div>
                    {day.duties.length === 0 ? (
                      <span className="text-xs text-slate-300 italic">No duties</span>
                    ) : (
                      <div className="space-y-1">
                        {day.duties.map(duty => (
                          <div key={duty.id} className="flex items-center gap-2 text-sm">
                            <span>{getDutyEmoji(duty.template?.name ?? '')}</span>
                            <span className="flex-1 text-slate-700 font-medium">{duty.template?.name ?? 'Duty'}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              duty.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                              duty.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {duty.status === 'APPROVED' ? '✅ Done' : duty.status === 'SUBMITTED' ? '📬 Review' : '⏳ Pending'}
                            </span>
                            <span className="text-xs text-slate-400">{duty.template?.defaultPoints ?? 0}pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* ── Cycle Report Modal ───────────────────────────────────────── */}
      {showCycleReport && (
        <Modal
          title={`📊 Cycle Report`}
          onClose={() => setShowCycleReport(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {new Date(showCycleReport.startAt).toLocaleDateString()} – {new Date(showCycleReport.endAt).toLocaleDateString()}
            </p>
            {showCycleReport.kidSummaries.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No data for this cycle.</p>
            ) : (
              <div className="space-y-3">
                {[...showCycleReport.kidSummaries].sort((a, b) => b.totalPoints - a.totalPoints).map((ks, i) => (
                  <div key={ks.kidId} className={`flex items-center gap-4 p-4 rounded-2xl ${i === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
                    <span className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-2xl">{AVATAR_EMOJI[ks.avatarSlug] ?? AVATAR_EMOJI.default}</span>
                    <div className="flex-1">
                      <div className="font-black text-slate-800">{ks.kidName}</div>
                      <div className="text-xs text-slate-500">{ks.approved} / {ks.total} duties done</div>
                      <div className="h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                          style={{ width: `${ks.total > 0 ? Math.round((ks.approved / ks.total) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-amber-500">⭐ {ks.totalPoints}</div>
                      <div className="text-xs text-slate-400">points</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cycleHistory.length > 1 && (
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Cycles</p>
                <div className="space-y-1">
                  {cycleHistory.slice(1).map(c => (
                    <button key={c.id} onClick={() => setShowCycleReport(c)}
                      className="w-full text-left text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition">
                      {new Date(c.startAt).toLocaleDateString()} – {new Date(c.endAt).toLocaleDateString()} · {c.kidSummaries.reduce((s, k) => s + k.totalPoints, 0)} total pts
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ParentDashboard;
