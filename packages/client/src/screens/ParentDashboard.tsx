import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

interface DutyInstance { id: string; status: string; template?: { name: string; defaultPoints: number }; }
interface Kid { id: string; name: string; avatarSlug: string; dutyInstances: DutyInstance[]; }
interface Template { id: string; name: string; defaultPoints: number; recurrence: string; }

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
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">{t('appName')}</h1>
              <p className="text-xs text-slate-400">{t('parent.console_label')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Hi, <strong>{user?.name}</strong></span>
            {/* Family code — share this with kids so they can log in on a new device */}
            <button
              title={`Family code: ${user?.householdId}`}
              onClick={() => { navigator.clipboard.writeText(user?.householdId ?? ''); }}
              className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 font-mono transition"
            >
              🔑 {user?.householdId?.slice(0, 8)}…
            </button>
            <LanguageToggle />
            <button onClick={openDutyLibrary}
              className="text-sm px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition">
              📋 {t('parent.duties_tab')}
            </button>
            <button onClick={() => { setShowAddKid(true); setAddKidError(''); }}
              className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow hover:opacity-90 transition">
              {t('parent.add_hero')}
            </button>
            <button onClick={() => navigate('/assign')} data-testid="btn-assign-screen"
              className="text-sm px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition">
              📈 Assignments
            </button>
            <button onClick={handleOpenInvite} data-testid="btn-invite-partner"
              className="text-sm px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition">
              {t('invite.btn')}
            </button>
            <button onClick={logout} data-testid="btn-logout"
              className="text-sm px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 font-medium transition">
              {t('parent.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: t('parent.heroes_tab'), value: kids.length, icon: '🦸', color: 'from-indigo-500 to-purple-600' },
            { label: t('parent.awaiting_review'), value: totalPending, icon: '⏳', color: 'from-amber-400 to-orange-500' },
            { label: t('parent.total_duties'), value: kids.reduce((s, k) => s + k.dutyInstances.length, 0), icon: '✅', color: 'from-emerald-400 to-teal-500' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white card-shadow`}>
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="text-white/70 text-sm font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Heroes grid */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('parent.heroes_tab')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kids.map(kid => {
            const pending = kid.dutyInstances.filter(d => d.status === 'ASSIGNED').length;
            const submitted = kid.dutyInstances.filter(d => d.status === 'SUBMITTED').length;
            const approved = kid.dutyInstances.filter(d => d.status === 'APPROVED').length;
            const total = kid.dutyInstances.length;
            const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
            const avatar = AVATAR_EMOJI[kid.avatarSlug] ?? AVATAR_EMOJI.default;
            return (
              <div key={kid.id} className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl flex-shrink-0">{avatar}</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{kid.name}</h3>
                    <p className="text-sm text-slate-400">{total} {t('parent.duties_today')}</p>
                  </div>
                </div>

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

                <button onClick={() => openAssign(kid)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition shadow">
                  + {t('parent.assign_duty')}
                </button>
              </div>
            );
          })}

          {/* Add Hero card */}
          <div onClick={() => { setShowAddKid(true); setAddKidError(''); }}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40 cursor-pointer transition-all">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-3">➕</div>
            <p className="font-bold text-sm">{t('parent.modal_add_hero')}</p>
            <p className="text-xs mt-1">{t('parent.register_kid')}</p>
          </div>
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
            <button type="submit" disabled={addKidLoading}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition disabled:opacity-60">
              {addKidLoading ? t('parent.adding') : `🦸 ${t('parent.btn_add_hero')}`}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Assign Duty Modal ───────────────────────────────────────── */}
      {assignTarget && (
        <Modal title={`📋 ${t('parent.modal_assign')} ${assignTarget.name}`} onClose={() => setAssignTarget(null)}>
          <form onSubmit={handleAssign} className="space-y-4">
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
    </div>
  );
};

export default ParentDashboard;
