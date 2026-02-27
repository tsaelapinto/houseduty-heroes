import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

// All kids in household (with all today's duties)
router.get('/', async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const { householdId } = req.query as { householdId?: string };

  const kids = await prisma.user.findMany({
    where: { role: 'KID', ...(householdId ? { householdId } : {}) },
    include: {
      dutyInstances: {
        where: { date: { gte: today, lt: tomorrow } },
        include: { template: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json(kids);
});

router.get('/:id', async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const kid = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      dutyInstances: {
        where: { date: { gte: today, lt: tomorrow } },
        include: { template: true },
      },
    },
  });
  if (!kid) return res.status(404).json({ error: 'Kid not found' });
  res.json(kid);
});

export default router;
