import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

interface Template { id: string; name: string; defaultPoints: number; recurrence: string; }
interface Kid      { id: string; name: string; avatarSlug: string; }

const DUTY_EMOJI: Record<string, string> = {
  'kitchen':'🍽️','dishes':'🍽️','laundry':'👕','fold':'👕','sweep':'🧹',
  'vacuum':'🧹','trash':'🗑️','litter':'🗑️','bed':'🛏️','bedsheet':'🛏️',
  'table':'🪑','dog':'🐶','pet':'🐾','feed':'🐾','fridge':'🧊','refriger':'🧊',
  'entrance':'🚪','floor':'🧹',
};
const getDutyEmoji = (name: string) => {
  const low = name.toLowerCase();
  const match = Object.entries(DUTY_EMOJI).find(([k]) => low.includes(k));
  return match ? match[1] : '📋';
};

const AVATAR_EMOJI: Record<string, string> = {
  'strawberry-elephant':'🐘','ballerina-capuchina':'🩰',
  'disco-panda':'🐼','super-rocket':'🚀','ninja-turtle':'🐢','robo-cat':'🤖',
};

const RECURRENCE_LABEL: Record<string, string> = {
  daily:'daily', weekdays:'Mon–Fri', weekends:'Sat–Sun',
  '3x':'3×/wk', '2x':'2×/wk', weekly:'weekly', monthly:'monthly',
  once_per_iteration:'once/cycle',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// ── Component ────────────────────────────────────────────────────────────────
const AssignmentScreen: React.FC = () => {
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);

  const [templates,   setTemplates]   = useState<Template[]>([]);
  const [kids,        setKids]        = useState<Kid[]>([]);
  const [assignments, setAssignments] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [processing,  setProcessing]  = useState<Set<string>>(new Set());
  const [selected,    setSelected]    = useState<string | null>(null); // selected templateId
  const [dragging,    setDragging]    = useState<string | null>(null); // dragged templateId
  const [dragOver,    setDragOver]    = useState<string | null>(null); // dragOver kidId
  const [cycleInfo,   setCycleInfo]   = useState<{ startAt: string; endAt: string } | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const load = useCallback(async () => {
    if (!user?.householdId) return;
    setLoading(true);
    try {
      const [tpls, ks, asgn] = await Promise.all([
        apiClient.get(`/duties/templates?householdId=${user.householdId}`),
        apiClient.get(`/kids?householdId=${user.householdId}`),
        apiClient.get(`/cycles/assignments?householdId=${user.householdId}`),
      ]);
      setTemplates(tpls);
      setKids(ks);
      if (asgn.startAt) setCycleInfo({ startAt: asgn.startAt, endAt: asgn.endAt });
      const set = new Set<string>((asgn.assignments ?? []).map((a: any) => `${a.templateId}:${a.kidId}`));
      setAssignments(set);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.householdId]);

  useEffect(() => { load(); }, [load]);

  const toggleAssignment = async (templateId: string, kidId: string) => {
    const key = `${templateId}:${kidId}`;
    if (processing.has(key)) return;
    setProcessing(p => new Set(p).add(key));
    const wasAssigned = assignments.has(key);
    // optimistic update
    setAssignments(prev => {
      const n = new Set(prev);
      wasAssigned ? n.delete(key) : n.add(key);
      return n;
    });
    try {
      if (wasAssigned) {
        await (apiClient as any).deleteBody('/cycles/unassign-template',
          { householdId: user!.householdId, templateId, kidId });
        showToast('Duty removed ✓');
      } else {
        await apiClient.post('/cycles/assign-template',
          { householdId: user!.householdId, templateId, kidId });
        const tpl = templates.find(t => t.id === templateId);
        const kid = kids.find(k => k.id === kidId);
        showToast(`✅ ${tpl?.name ?? 'Duty'} → ${kid?.name ?? 'Hero'}`);
      }
    } catch (err: any) {
      // revert on error
      setAssignments(prev => {
        const n = new Set(prev);
        wasAssigned ? n.add(key) : n.delete(key);
        return n;
      });
      showToast('❌ ' + (err.message ?? 'Error'));
    } finally {
      setProcessing(p => { const n = new Set(p); n.delete(key); return n; });
    }
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    setDragging(templateId);
    setSelected(templateId);
  };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOver = (e: React.DragEvent, kidId: string) => { e.preventDefault(); setDragOver(kidId); };
  const onDrop = (e: React.DragEvent, kidId: string) => {
    e.preventDefault();
    if (dragging) toggleAssignment(dragging, kidId);
    setDragging(null); setDragOver(null);
  };

  // ── Click-to-assign (mobile & desktop fallback) ───────────────────────────
  const onTemplateClick = (templateId: string) =>
    setSelected(prev => prev === templateId ? null : templateId);

  const onKidZoneClick = (kidId: string) => {
    if (!selected) return;
    toggleAssignment(selected, kidId);
    setSelected(null);
  };

  const onChipRemove = (e: React.MouseEvent, templateId: string, kidId: string) => {
    e.stopPropagation();
    toggleAssignment(templateId, kidId);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📋</div>
        <p className="text-slate-500 font-semibold">Loading assignments…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="assignment-screen">
      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-800 text-white text-sm font-bold shadow-2xl pointer-events-none"
          style={{ animation: 'overlay-in 0.2s ease-out' }}>
          {toast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/app')}
            className="text-slate-500 hover:text-slate-800 font-bold text-sm px-3 py-2 rounded-xl hover:bg-slate-100 transition">
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800 leading-tight">📋 Duty Assignment</h1>
            {cycleInfo
              ? <p className="text-xs text-slate-400">Cycle: {fmt(cycleInfo.startAt)} – {fmt(cycleInfo.endAt)}</p>
              : <p className="text-xs text-slate-400">No active cycle — drag a duty to auto-create one</p>
            }
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            {selected
              ? <span className="text-indigo-600 font-bold">📌 {templates.find(t=>t.id===selected)?.name} — tap a hero to assign</span>
              : '← tap or drag a duty'}
          </div>
        </div>
        {/* Mobile selection hint */}
        {selected && (
          <div className="max-w-6xl mx-auto mt-2 sm:hidden">
            <div className="px-4 py-2 bg-indigo-50 rounded-xl text-xs text-indigo-700 font-bold">
              📌 {templates.find(t=>t.id===selected)?.name} selected — tap a hero column to assign
            </div>
          </div>
        )}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-4">

        {/* ── Duty Pool (Left) ─────────────────────────────────────────────── */}
        <div className="lg:w-72 lg:flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Duty Pool
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag or tap to select, then tap a hero
              </p>
            </div>
            <div className="p-3 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              {templates.map(tpl => {
                const isSelected = selected === tpl.id;
                const isDragging = dragging === tpl.id;
                const assignedCount = kids.filter(k => assignments.has(`${tpl.id}:${k.id}`)).length;
                return (
                  <div
                    key={tpl.id}
                    draggable
                    onDragStart={e => onDragStart(e, tpl.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => onTemplateClick(tpl.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing select-none transition-all"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : '#f8fafc',
                      border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                      opacity: isDragging ? 0.5 : 1,
                      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : undefined,
                    }}
                  >
                    <span className="text-2xl">{getDutyEmoji(tpl.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{tpl.name}</p>
                      <p className="text-xs text-slate-400">
                        {tpl.defaultPoints}⭐ · {RECURRENCE_LABEL[tpl.recurrence] ?? tpl.recurrence}
                      </p>
                    </div>
                    {assignedCount > 0 && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 font-black px-2 py-0.5 rounded-full flex-shrink-0">
                        {assignedCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Hero Columns (Right) ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-0" style={{ minWidth: `${kids.length * 220}px` }}>
            {kids.length === 0 ? (
              <div className="flex-1 bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-3xl mb-2">🦸</p>
                <p className="text-slate-500 font-bold">No heroes yet</p>
                <p className="text-slate-400 text-sm mt-1">Add heroes from the dashboard first</p>
              </div>
            ) : kids.map(kid => {
              const isOver = dragOver === kid.id;
              const hasSelected = !!selected;
              const kidTemplates = templates.filter(t => assignments.has(`${t.id}:${kid.id}`));

              return (
                <div
                  key={kid.id}
                  className="flex-1 min-w-[200px] flex flex-col"
                  onDragOver={e => onDragOver(e, kid.id)}
                  onDrop={e => onDrop(e, kid.id)}
                  onDragLeave={() => setDragOver(null)}
                >
                  {/* Hero header — also acts as tap target */}
                  <div
                    onClick={() => onKidZoneClick(kid.id)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 p-4 text-center cursor-pointer transition-all hover:shadow-md"
                    style={{
                      border: isOver ? '2px solid #6366f1' : hasSelected ? '2px solid #c7d2fe' : '2px solid transparent',
                      background: isOver ? '#eef2ff' : hasSelected ? '#f5f3ff' : 'white',
                    }}
                  >
                    <div className="text-4xl mb-1">{AVATAR_EMOJI[kid.avatarSlug] ?? '⭐'}</div>
                    <p className="font-black text-slate-800 text-sm">{kid.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{kidTemplates.length} duties</p>
                    {hasSelected && (
                      <p className="text-xs text-indigo-600 font-bold mt-2">
                        {assignments.has(`${selected}:${kid.id}`) ? '✕ tap to remove' : '+ tap to assign'}
                      </p>
                    )}
                  </div>

                  {/* Assigned duty chips */}
                  <div
                    className="flex-1 rounded-2xl p-3 space-y-2 min-h-[120px] transition-all"
                    style={{
                      background: isOver ? 'rgba(99,102,241,0.08)' : '#f8fafc',
                      border: isOver ? '2px dashed #6366f1' : '2px dashed #e2e8f0',
                    }}
                    onClick={() => onKidZoneClick(kid.id)}
                  >
                    {kidTemplates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-20 text-slate-300">
                        <p className="text-2xl">➕</p>
                        <p className="text-xs font-bold mt-1">
                          {isOver ? 'Drop here!' : (hasSelected ? 'Tap to assign' : 'Drag or tap duty ←')}
                        </p>
                      </div>
                    ) : kidTemplates.map(tpl => {
                      const key = `${tpl.id}:${kid.id}`;
                      const busy = processing.has(key);
                      const isHighlighted = selected === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm border border-slate-100 group transition-all"
                          style={{ border: isHighlighted ? '1.5px solid #6366f1' : undefined }}
                        >
                          <span className="text-lg">{getDutyEmoji(tpl.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{tpl.name}</p>
                            <p className="text-xs text-slate-400">{tpl.defaultPoints}⭐</p>
                          </div>
                          <button
                            onClick={e => onChipRemove(e, tpl.id, kid.id)}
                            disabled={busy}
                            className="w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-slate-400 text-xs font-bold transition flex-shrink-0"
                          >
                            {busy ? '…' : '✕'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentScreen;
