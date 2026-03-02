import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

router.get('/', async (req, res) => {
  const { householdId } = req.query as { householdId?: string };
  if (!householdId) return res.status(400).json({ error: 'householdId is required' });

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      cycleFrequency: true,
      timezone: true,
      users: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarSlug: true,
          email: true,
          householdId: true,
          morningReminderTime: true,
          eveningReminderTime: true,
          createdAt: true,
        },
      },
      dutyTemplates: true,
    },
  });
  if (!household) return res.status(404).json({ error: 'Household not found' });
  res.json(household);
});

router.get('/stats', async (req, res) => {
  const { householdId } = req.query as { householdId?: string };
  if (!householdId) return res.status(400).json({ error: 'householdId is required' });

  const kidCount = await prisma.user.count({ where: { role: 'KID', householdId } });
  const pendingApprovals = await prisma.dutyInstance.count({
    where: { status: 'SUBMITTED', kid: { householdId } },
  });
  res.json({ kidCount, pendingApprovals });
});

export default router;
