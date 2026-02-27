import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

const OOTB_DUTIES = [
  { name: 'Make bed',            defaultPoints: 10,  recurrence: 'daily'    },
  { name: 'Set the table',       defaultPoints: 10,  recurrence: 'daily'    },
  { name: 'Clear the table',     defaultPoints: 15,  recurrence: 'daily'    },
  { name: 'Feed the pet',        defaultPoints: 15,  recurrence: 'daily'    },
  { name: 'Load dishwasher',     defaultPoints: 15,  recurrence: 'daily'    },
  { name: 'Wash dishes',         defaultPoints: 20,  recurrence: 'daily'    },
  { name: 'Sweep the floor',     defaultPoints: 15,  recurrence: '3x'       },
  { name: 'Tidy bedroom',        defaultPoints: 20,  recurrence: '3x'       },
  { name: 'Walk the dog',        defaultPoints: 25,  recurrence: '3x'       },
  { name: 'Take out trash',      defaultPoints: 15,  recurrence: 'weekly'   },
  { name: 'Fold laundry',        defaultPoints: 20,  recurrence: 'weekly'   },
  { name: 'Vacuum living room',  defaultPoints: 25,  recurrence: 'weekly'   },
];

// ─── Get duty templates for a household (auto-seeds OOTB on first call) ───
router.get('/templates', async (req, res) => {
  const { householdId } = req.query as { householdId: string };
  if (!householdId) return res.status(400).json({ error: 'householdId required' });

  let templates = await prisma.dutyTemplate.findMany({
    where: { householdId, isActive: true },
    orderBy: { name: 'asc' },
  });

  // Auto-seed OOTB duties the first time a household has none
  if (templates.length === 0) {
    await prisma.dutyTemplate.createMany({
      data: OOTB_DUTIES.map(d => ({ ...d, householdId, isActive: true })),
    });
    templates = await prisma.dutyTemplate.findMany({
      where: { householdId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  res.json(templates);
});

// ─── Create a duty template ────────────────────────────────────────────────
router.post('/templates', async (req, res) => {
  try {
    const { householdId, name, defaultPoints, recurrence } = req.body;
    if (!householdId || !name) return res.status(400).json({ error: 'householdId and name are required' });
    const template = await prisma.dutyTemplate.create({
      data: {
        householdId, name: String(name).trim(),
        defaultPoints: Number(defaultPoints) || 10,
        recurrence: String(recurrence || 'daily'),
        isActive: true,
      },
    });
    res.status(201).json(template);
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ─── Edit a duty template ─────────────────────────────────────────────────
router.patch('/templates/:id', async (req, res) => {
  try {
    const { name, defaultPoints, recurrence } = req.body;
    const data: Record<string, unknown> = {};
    if (name       !== undefined) data.name          = String(name).trim();
    if (defaultPoints !== undefined) data.defaultPoints = Number(defaultPoints) || 10;
    if (recurrence !== undefined) data.recurrence   = String(recurrence);
    const updated = await prisma.dutyTemplate.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    console.error('Patch template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ─── Delete (soft) a duty template ────────────────────────────────────────
router.delete('/templates/:id', async (req, res) => {
  try {
    await prisma.dutyTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ─── Get today's duties for a kid ─────────────────────────────────────────
router.get('/today/:kidId', async (req, res) => {
  const { kidId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const duties = await prisma.dutyInstance.findMany({
    where: { kidId, date: { gte: today, lt: tomorrow } },
    include: { template: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(duties);
});

// ─── Parent assigns a duty to a kid ───────────────────────────────────────
router.post('/assign', async (req, res) => {
  const { kidId, templateId, date, points, householdId } = req.body;
  if (!kidId || !householdId) {
    return res.status(400).json({ error: 'kidId and householdId are required' });
  }

  // Find or create the active cycle for this household
  let cycle = await prisma.cycle.findFirst({
    where: { householdId, status: 'ACTIVE' },
    orderBy: { startAt: 'desc' },
  });

  if (!cycle) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    cycle = await prisma.cycle.create({
      data: { householdId, startAt: start, endAt: end, status: 'ACTIVE' },
    });
  }

  // Get template details for a custom name/points fallback
  const template = templateId
    ? await prisma.dutyTemplate.findUnique({ where: { id: templateId } })
    : null;

  const instance = await prisma.dutyInstance.create({
    data: {
      cycleId: cycle.id,
      templateId: templateId || undefined,
      kidId,
      date: date ? new Date(date) : new Date(),
      pointsOverride: points || template?.defaultPoints || 10,
      status: 'ASSIGNED',
    },
    include: { template: true },
  });
  res.status(201).json(instance);
});

// ─── Submit a duty ─────────────────────────────────────────────────────────
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const duty = await prisma.dutyInstance.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submission: { create: { submittedAt: new Date() } },
      },
    });
    res.json(duty);
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit duty' });
  }
});

// ─── Parent approves a duty ────────────────────────────────────────────────
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { parentId, points } = req.body;

    const duty = await prisma.dutyInstance.findUnique({
      where: { id }, include: { template: true },
    });
    if (!duty) return res.status(404).json({ error: 'Duty not found' });

    const pointsToAward = points ?? duty.pointsOverride ?? duty.template?.defaultPoints ?? 10;

    await prisma.approval.create({
      data: { dutyInstanceId: id, parentId, pointsAwarded: pointsToAward },
    });
    const updated = await prisma.dutyInstance.update({ where: { id }, data: { status: 'APPROVED' } });
    res.json(updated); // return updated duty so callers can read .status
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve duty' });
  }
});

export default router;
