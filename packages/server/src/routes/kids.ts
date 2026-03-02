import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/client';

const router = Router();

// All kids in household (with all today's duties)
router.get('/', async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const { householdId } = req.query as { householdId?: string };
  if (!householdId) return res.status(400).json({ error: 'householdId is required' });

  // Security: Check if the household exists
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) return res.status(404).json({ error: 'Household not found' });

  const kids = await prisma.user.findMany({
    where: { role: 'KID', householdId },
    select: {
      id: true,
      name: true,
      avatarSlug: true,
      householdId: true,
      morningReminderTime: true,
      eveningReminderTime: true,
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
    select: {
      id: true,
      name: true,
      avatarSlug: true,
      householdId: true,
      morningReminderTime: true,
      eveningReminderTime: true,
      dutyInstances: {
        where: { date: { gte: today, lt: tomorrow } },
        include: { template: true },
      },
    },
  });
  if (!kid) return res.status(404).json({ error: 'Kid not found' });
  res.json(kid);
});

// Reset a kid's PIN — callable by parent (scoped by householdId check)
router.patch('/:id/pin', async (req, res) => {
  const { newPin, householdId } = req.body;
  if (!newPin || String(newPin).length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  // Safety: make sure the kid belongs to the requesting household
  const kid = await prisma.user.findFirst({ where: { id: req.params.id, role: 'KID', householdId: String(householdId) } });
  if (!kid) return res.status(404).json({ error: 'Hero not found' });
  const kidPin = await bcrypt.hash(String(newPin), 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { kidPin } });
  res.json({ ok: true });
});

router.patch('/:id/reminders', async (req, res) => {
  const { morningReminderTime, eveningReminderTime, householdId } = req.body;
  // Safety: ensure the kid belongs to the requesting household
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, role: 'KID', householdId: String(householdId) } });
  if (!existing) return res.status(404).json({ error: 'Hero not found' });
  const kid = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      morningReminderTime: morningReminderTime || null,
      eveningReminderTime: eveningReminderTime || null,
    },
    select: { id: true, name: true, morningReminderTime: true, eveningReminderTime: true },
  });
  res.json(kid);
});

export default router;
