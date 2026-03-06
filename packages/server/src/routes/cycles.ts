import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };

// Returns an array of day-offsets (0-based) within a cycle that match the recurrence rule
const recurrenceDays = (recurrence: string, startAt: Date, totalDays: number): number[] => {
  const days: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dow = addDays(startAt, i).getDay(); // 0=Sun 1=Mon ... 6=Sat
    const ok =
      recurrence === 'weekdays' ? dow >= 1 && dow <= 5 :
      recurrence === 'weekends' ? dow === 0 || dow === 6 :
      recurrence === '3x'       ? [1, 3, 5].includes(dow) :   // Mon Wed Fri
      recurrence === '2x'       ? [2, 4].includes(dow)   :    // Tue Thu
      recurrence === 'weekly'   ? i === 0                :    // once: first day
      recurrence === 'once_per_cycle' ? i === 0          :    // same as weekly for now
      true;                                                    // daily (default)
    if (ok) days.push(i);
  }
  return days;
};

// ─── GET /cycles/active ────────────────────────────────────────────────────
// Returns the active cycle (+ per-kid stats) for the calling user's household.
router.get('/active', async (req, res) => {
  try {
    const householdId = req.query.householdId as string;
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    const cycle = await prisma.cycle.findFirst({
      where: { householdId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
      include: {
        dutyInstances: {
          include: { template: true, kid: true, approval: true },
        },
      },
    });

    if (!cycle) return res.json(null);

    // Build per-kid summary
    const kidMap: Record<string, { kidId: string; kidName: string; totalPoints: number; assigned: number; submitted: number; approved: number }> = {};
    for (const inst of cycle.dutyInstances) {
      if (!kidMap[inst.kidId]) {
        kidMap[inst.kidId] = {
          kidId: inst.kidId,
          kidName: inst.kid.name,
          totalPoints: 0,
          assigned: 0,
          submitted: 0,
          approved: 0,
        };
      }
      const k = kidMap[inst.kidId];
      if (inst.status === 'ASSIGNED') k.assigned++;
      if (inst.status === 'SUBMITTED') k.submitted++;
      if (inst.status === 'APPROVED') {
        k.approved++;
        k.totalPoints += inst.approval?.pointsAwarded ?? inst.pointsOverride ?? inst.template?.defaultPoints ?? 0;
      }
    }

    return res.json({ ...cycle, kidSummaries: Object.values(kidMap) });
  } catch (err) {
    console.error('GET /cycles/active error:', err);
    return res.status(500).json({ error: 'Failed to fetch active cycle' });
  }
});

// ─── POST /cycles/start ────────────────────────────────────────────────────
// Closes the current active cycle (if any) and starts a new cycle.
// Body: { householdId, mode: 'same' | 'rotate' | 'manual', manualAssignments?: [{ templateId, kidId }], durationDays?: number }
router.post('/start', async (req, res) => {
  try {
    const { householdId, mode = 'same', manualAssignments, durationDays } = req.body;
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    // Fetch household config for default duration/timezone
    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) return res.status(404).json({ error: 'Household not found' });

    // 1. Close any current ACTIVE cycle
    await prisma.cycle.updateMany({
      where: { householdId, status: 'ACTIVE' },
      data: { status: 'CLOSED' },
    });

    // 2. Determine start/end using timezone logic (simplified to local/UTC for now, assuming server handles offset)
    const startAt = startOfDay(new Date());
    const freq = (household as any).cycleFrequency as string | undefined;
    const finalDuration = Number(durationDays) || (freq === 'biweekly' ? 14 : freq === 'monthly' ? 30 : 7);
    const endAt = addDays(startAt, finalDuration);

    // 3. Create new cycle
    const cycle = await prisma.cycle.create({
      data: { householdId, startAt, endAt, status: 'ACTIVE' },
    });

    // 4. Build assignment pairs: [{ templateId, kidId }]
    let assignments: { templateId: string; kidId: string }[] = [];

    if (mode === 'manual' && Array.isArray(manualAssignments) && manualAssignments.length > 0) {
      assignments = manualAssignments;
    } else {
      // Fetch active templates with their allowedKids
      const templates = await prisma.dutyTemplate.findMany({
        where: { householdId, isActive: true },
        include: { allowedKids: true },
      });

      if (mode === 'rotate') {
        // For each template, find who was last assigned in the previous closed cycle
        const lastCycle = await prisma.cycle.findFirst({
          where: { householdId, status: 'CLOSED' },
          orderBy: { endAt: 'desc' },
          include: { dutyInstances: { select: { templateId: true, kidId: true, date: true } } },
        });

        for (const tpl of templates) {
          const kidIds = tpl.allowedKids.map((k: { kidId: string }) => k.kidId);
          if (kidIds.length === 0) continue;

          let nextKidId = kidIds[0];
          if (lastCycle) {
            // Find last assigned kid for this template in the previous cycle
            const lastInstance = lastCycle.dutyInstances
              .filter((d) => d.templateId === tpl.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (lastInstance) {
              const lastIdx = kidIds.indexOf(lastInstance.kidId);
              nextKidId = kidIds[(lastIdx + 1) % kidIds.length];
            }
          }
          assignments.push({ templateId: tpl.id, kidId: nextKidId });
        }
      } else {
        // mode = 'same' or fallback: assign each template to its first allowed kid
        // (or copy from last cycle if 'same')
        if (mode === 'same') {
          const lastCycle = await prisma.cycle.findFirst({
            where: { householdId, status: 'CLOSED' },
            orderBy: { endAt: 'desc' },
            include: { dutyInstances: { distinct: ['templateId', 'kidId'], select: { templateId: true, kidId: true } } },
          });
          if (lastCycle && lastCycle.dutyInstances.length > 0) {
            // Deduplicate: one pair per templateId
            const seen = new Set<string>();
            for (const inst of lastCycle.dutyInstances) {
              if (inst.templateId && !seen.has(inst.templateId)) {
                seen.add(inst.templateId);
                assignments.push({ templateId: inst.templateId, kidId: inst.kidId });
              }
            }
          }
        }

        // If still no assignments (first cycle ever, or same with no history), assign each template to first allowed kid
        if (assignments.length === 0) {
          for (const tpl of templates) {
            const kidIds = tpl.allowedKids.map((k: { kidId: string }) => k.kidId);
            if (kidIds.length > 0) {
              assignments.push({ templateId: tpl.id, kidId: kidIds[0] });
            }
          }
        }

        // If there are still no assignments (templates have no allowedKids), assign to ALL kids in household
        if (assignments.length === 0) {
          const allKids = await prisma.user.findMany({ where: { householdId, role: 'KID' } });
          for (const tpl of templates) {
            for (const kid of allKids) {
              assignments.push({ templateId: tpl.id, kidId: kid.id });
            }
          }
        }
      }
    }

    // 5. Fetch recurrence for each template, then create DutyInstances
    const templateIds = [...new Set(assignments.map(a => a.templateId))];
    const recurrenceMap: Record<string, string> = {};
    if (templateIds.length > 0) {
      const tpls = await prisma.dutyTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, recurrence: true },
      });
      for (const t of tpls) recurrenceMap[t.id] = t.recurrence ?? 'daily';
    }

    const totalDays = finalDuration;
    const instances: any[] = [];
    for (const { templateId, kidId } of assignments) {
      const recurrence = recurrenceMap[templateId] ?? 'daily';
      const days = recurrenceDays(recurrence, startAt, totalDays);
      for (const day of days) {
        instances.push({
          cycleId: cycle.id,
          templateId,
          kidId,
          date: addDays(startAt, day),
          status: 'ASSIGNED',
        });
      }
    }

    if (instances.length > 0) {
      await prisma.dutyInstance.createMany({ data: instances });
    }

    const result = await prisma.cycle.findUnique({
      where: { id: cycle.id },
      include: { dutyInstances: { include: { template: true } } },
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('POST /cycles/start error:', err);
    return res.status(500).json({ error: 'Failed to start cycle' });
  }
});

// ─── POST /cycles/close ───────────────────────────────────────────────────
router.post('/close', async (req, res) => {
  try {
    const { householdId } = req.body;
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    const result = await prisma.cycle.updateMany({
      where: { householdId, status: 'ACTIVE' },
      data: { status: 'CLOSED' },
    });
    return res.json({ ok: true, closed: result.count });
  } catch (err) {
    console.error('POST /cycles/close error:', err);
    return res.status(500).json({ error: 'Failed to close cycle' });
  }
});

// ─── GET /cycles/history ──────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const { householdId } = req.query as { householdId: string };
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    const cycles = await prisma.cycle.findMany({
      where: { householdId, status: 'CLOSED' },
      orderBy: { startAt: 'desc' },
      take: 10,
      include: {
        dutyInstances: {
          include: { template: true, kid: true, approval: true },
        },
      },
    });

    const reports = cycles.map(cycle => {
      const kidMap: Record<string, { kidId: string; kidName: string; avatarSlug: string; totalPoints: number; approved: number; total: number }> = {};
      for (const inst of cycle.dutyInstances) {
        if (!kidMap[inst.kidId]) {
          kidMap[inst.kidId] = { kidId: inst.kidId, kidName: inst.kid.name, avatarSlug: inst.kid.avatarSlug, totalPoints: 0, approved: 0, total: 0 };
        }
        const k = kidMap[inst.kidId];
        k.total++;
        if (inst.status === 'APPROVED') {
          k.approved++;
          k.totalPoints += inst.approval?.pointsAwarded ?? inst.pointsOverride ?? inst.template?.defaultPoints ?? 0;
        }
      }
      return { id: cycle.id, startAt: cycle.startAt, endAt: cycle.endAt, kidSummaries: Object.values(kidMap) };
    });

    return res.json(reports);
  } catch (err) {
    console.error('GET /cycles/history error:', err);
    return res.status(500).json({ error: 'Failed to fetch cycle history' });
  }
});

// ─── GET /cycles/assignments?householdId=X ─────────────────────────────────
// Returns unique template+kid pairs for the active cycle (the assignment matrix).
router.get('/assignments', async (req, res) => {
  try {
    const { householdId } = req.query as { householdId: string };
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    const cycle = await prisma.cycle.findFirst({
      where: { householdId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
    });
    if (!cycle) return res.json({ cycleId: null, startAt: null, endAt: null, assignments: [] });

    const rows = await prisma.dutyInstance.findMany({
      where: { cycleId: cycle.id },
      select: { templateId: true, kidId: true },
      orderBy: { date: 'asc' },
    });

    // Deduplicate to unique (templateId, kidId) pairs
    const seen = new Set<string>();
    const assignments: { templateId: string; kidId: string }[] = [];
    for (const r of rows) {
      if (!r.templateId) continue;
      const key = `${r.templateId}:${r.kidId}`;
      if (!seen.has(key)) { seen.add(key); assignments.push({ templateId: r.templateId, kidId: r.kidId }); }
    }

    return res.json({ cycleId: cycle.id, startAt: cycle.startAt, endAt: cycle.endAt, assignments });
  } catch (err) {
    console.error('GET /cycles/assignments error:', err);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// ─── POST /cycles/assign-template ─────────────────────────────────────────
// Assigns a duty template to a kid for all remaining days of the active cycle.
// Auto-creates a cycle if none exists.
router.post('/assign-template', async (req, res) => {
  try {
    const { householdId, templateId, kidId } = req.body;
    if (!householdId || !templateId || !kidId)
      return res.status(400).json({ error: 'householdId, templateId, kidId required' });

    let cycle = await prisma.cycle.findFirst({
      where: { householdId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
    });
    if (!cycle) {
      const start = startOfDay(new Date());
      cycle = await prisma.cycle.create({
        data: { householdId, startAt: start, endAt: addDays(start, 14), status: 'ACTIVE' },
      });
    }

    const template = await prisma.dutyTemplate.findUnique({ where: { id: templateId } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const cycleStart = new Date(cycle.startAt);
    const today = startOfDay(new Date());
    const totalDays = Math.ceil((new Date(cycle.endAt).getTime() - cycleStart.getTime()) / 86_400_000);
    const startOffset = Math.max(0, Math.ceil((today.getTime() - cycleStart.getTime()) / 86_400_000));

    const allDays = recurrenceDays(template.recurrence ?? 'daily', cycleStart, totalDays);
    const remainingDays = allDays.filter(d => d >= startOffset);

    // Remove any existing ASSIGNED instances so we don't double-up
    await prisma.dutyInstance.deleteMany({
      where: { cycleId: cycle.id, templateId, kidId, status: 'ASSIGNED' },
    });

    if (remainingDays.length > 0) {
      await prisma.dutyInstance.createMany({
        data: remainingDays.map(day => ({
          cycleId: cycle!.id, templateId, kidId,
          date: addDays(cycleStart, day),
          status: 'ASSIGNED',
          pointsOverride: template.defaultPoints,
        })),
      });
    }

    return res.json({ ok: true, cycleId: cycle.id, created: remainingDays.length });
  } catch (err) {
    console.error('POST /cycles/assign-template error:', err);
    return res.status(500).json({ error: 'Failed to assign template' });
  }
});

// ─── GET /cycles/timeline ─────────────────────────────────────────────────
// Returns the full day-by-day timeline for the active cycle (all kids, all duties).
// Each day lists every DutyInstance grouped under that date with kid info.
router.get('/timeline', async (req, res) => {
  try {
    const { householdId } = req.query as { householdId: string };
    if (!householdId) return res.status(400).json({ error: 'householdId required' });

    const cycle = await prisma.cycle.findFirst({
      where: { householdId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
      include: {
        dutyInstances: {
          include: { template: true, kid: true, approval: true },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!cycle) return res.json(null);

    // Build all days in the cycle (inclusive of startAt day)
    const totalDays = Math.max(1, Math.ceil(
      (new Date(cycle.endAt).getTime() - new Date(cycle.startAt).getTime()) / 86_400_000
    ));

    const dayMap: Record<string, {
      id: string; kidId: string; kidName: string; kidAvatarSlug: string;
      templateId: string | null; templateName: string | null;
      status: string; points: number;
    }[]> = {};

    // Pre-fill every day so days with no duties still appear
    for (let i = 0; i < totalDays; i++) {
      const key = addDays(new Date(cycle.startAt), i).toISOString().slice(0, 10);
      dayMap[key] = [];
    }

    for (const inst of cycle.dutyInstances) {
      const key = new Date(inst.date).toISOString().slice(0, 10);
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push({
        id: inst.id,
        kidId: inst.kidId,
        kidName: inst.kid.name,
        kidAvatarSlug: inst.kid.avatarSlug,
        templateId: inst.templateId,
        templateName: inst.template?.name ?? null,
        status: inst.status,
        points: inst.approval?.pointsAwarded ?? inst.pointsOverride ?? inst.template?.defaultPoints ?? 0,
      });
    }

    const days = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, duties]) => ({ date, duties }));

    return res.json({ id: cycle.id, startAt: cycle.startAt, endAt: cycle.endAt, status: cycle.status, days });
  } catch (err) {
    console.error('GET /cycles/timeline error:', err);
    return res.status(500).json({ error: 'Failed to fetch cycle timeline' });
  }
});

// ─── DELETE /cycles/unassign-template ─────────────────────────────────────
// Removes all future ASSIGNED instances for a template+kid in the active cycle.
router.delete('/unassign-template', async (req, res) => {
  try {
    const { householdId, templateId, kidId } = req.body;
    if (!householdId || !templateId || !kidId)
      return res.status(400).json({ error: 'householdId, templateId, kidId required' });

    const cycle = await prisma.cycle.findFirst({
      where: { householdId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
    });
    if (!cycle) return res.json({ ok: true, deleted: 0 });

    const { count } = await prisma.dutyInstance.deleteMany({
      where: {
        cycleId: cycle.id, templateId, kidId, status: 'ASSIGNED',
        date: { gte: startOfDay(new Date()) },
      },
    });

    return res.json({ ok: true, deleted: count });
  } catch (err) {
    console.error('DELETE /cycles/unassign-template error:', err);
    return res.status(500).json({ error: 'Failed to unassign template' });
  }
});

export default router;
