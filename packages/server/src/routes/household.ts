import { Router } from 'express';
import prisma from '../db/client';

const router = Router();

router.get('/', async (req, res) => {
  // Demo: assumes only one household exists
  const household = await prisma.household.findFirst({
    include: {
      users: true,
      dutyTemplates: true,
    }
  });
  res.json(household);
});

router.get('/stats', async (req, res) => {
  const kidCount = await prisma.user.count({ where: { role: 'KID' } });
  const pendingApprovals = await prisma.dutyInstance.count({ where: { status: 'SUBMITTED' } });
  
  res.json({
    kidCount,
    pendingApprovals,
  });
});

export default router;
