import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

// ─── GET /rewards/catalogue ─────────────────────────────────────────────────
router.get('/catalogue', async (_req, res) => {
  try {
    const items = await prisma.unlockableItem.findMany({ orderBy: { pointsCost: 'asc' } });
    return res.json(items);
  } catch (err) {
    console.error('GET /rewards/catalogue error:', err);
    return res.status(500).json({ error: 'Failed to fetch catalogue' });
  }
});

// ─── GET /rewards/kid/:id ─────────────────────────────────────────────────
// Returns total / spent / available points + list of unlocked item IDs.
router.get('/kid/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [approvals, unlocks, catalogue] = await Promise.all([
      prisma.approval.findMany({ where: { dutyInstance: { kidId: id } } }),
      prisma.userUnlock.findMany({ where: { userId: id }, include: { item: true } }),
      prisma.unlockableItem.findMany({ orderBy: { pointsCost: 'asc' } }),
    ]);

    const totalPoints = approvals.reduce((sum, a) => sum + a.pointsAwarded, 0);
    const spentPoints = unlocks.reduce((sum, u) => sum + u.item.pointsCost, 0);
    const availablePoints = totalPoints - spentPoints;

    return res.json({
      totalPoints,
      spentPoints,
      availablePoints,
      unlocks: unlocks.map((u) => ({ id: u.id, item: u.item, unlockedAt: u.unlockedAt })),
      catalogue,
    });
  } catch (err) {
    console.error('GET /rewards/kid/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// ─── POST /rewards/unlock ───────────────────────────────────────────────────
// Body: { kidId, itemId }
router.post('/unlock', async (req, res) => {
  try {
    const { kidId, itemId } = req.body;
    if (!kidId || !itemId) return res.status(400).json({ error: 'kidId and itemId required' });

    const item = await prisma.unlockableItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check already unlocked
    const existing = await prisma.userUnlock.findUnique({
      where: { userId_itemId: { userId: kidId, itemId } },
    });
    if (existing) return res.status(409).json({ error: 'Already unlocked' });

    // Check points
    const approvals = await prisma.approval.findMany({ where: { dutyInstance: { kidId } } });
    const unlocks = await prisma.userUnlock.findMany({ where: { userId: kidId }, include: { item: true } });
    const totalPoints = approvals.reduce((s, a) => s + a.pointsAwarded, 0);
    const spentPoints = unlocks.reduce((s, u) => s + u.item.pointsCost, 0);
    const available = totalPoints - spentPoints;

    if (available < item.pointsCost) {
      return res.status(400).json({ error: `Not enough points. Need ${item.pointsCost}, have ${available}.` });
    }

    const unlock = await prisma.userUnlock.create({
      data: { userId: kidId, itemId },
      include: { item: true },
    });

    return res.status(201).json(unlock);
  } catch (err) {
    console.error('POST /rewards/unlock error:', err);
    return res.status(500).json({ error: 'Failed to unlock item' });
  }
});

export default router;
