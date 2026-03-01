import { Router } from 'express';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../db/client';
import { Resend } from 'resend';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HouseDuty Heroes <noreply@harelitos.com>';

const requireParent = async (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'PARENT') return res.status(403).json({ error: 'Parents only' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/invite — create a 7-day invite link; optionally email it to a partner
router.post('/', requireParent, async (req: any, res) => {
  const { partnerEmail, partnerName } = req.body as { partnerEmail?: string; partnerName?: string };

  const token = randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const household = await prisma.household.findUnique({ where: { id: req.user.householdId } });
  const householdName = household?.name ?? 'the household';

  await (prisma as any).householdInvite.create({
    data: { householdId: req.user.householdId, token, createdById: req.user.id, expiresAt },
  });

  const baseUrl = process.env.APP_URL || 'https://app.harelitos.com';
  const inviteUrl = `${baseUrl}/join?code=${token}`;

  let emailSent = false;
  let emailError: string | undefined;

  if (partnerEmail && resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: partnerEmail,
        subject: `${req.user.name} invited you to join ${householdName} on HouseDuty Heroes! 🏠`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
            <h1 style="font-size:24px;margin-bottom:4px">🦸 HouseDuty Heroes</h1>
            <p style="color:#64748b;margin-top:0">Making home chores heroic</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
            <p><strong>${req.user.name}</strong> invited you to join <strong>${householdName}</strong>!</p>
            <p>Click the button below to create your parent account and join the family:</p>
            <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;margin:8px 0">🏠 Join Household</a>
            <p style="color:#94a3b8;font-size:13px;margin-top:24px">This link expires in 7 days and can only be used once.<br>If you didn't expect this email, you can safely ignore it.</p>
          </div>`,
      });
      emailSent = true;
    } catch (err: any) {
      emailError = err.message;
      console.error('Resend error:', err);
    }
  }

  return res.json({ token, url: inviteUrl, expiresAt, emailSent, emailError });
});

// GET /api/invite/:token — validate token, return household name
router.get('/:token', async (req, res) => {
  const invite = await (prisma as any).householdInvite.findUnique({
    where: { token: req.params.token },
    include: { household: true },
  });
  if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
  if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'This invite has expired' });
  if (invite.usedAt) return res.status(409).json({ error: 'This invite has already been used' });

  return res.json({
    householdName: invite.household.name,
    householdId: invite.householdId,
  });
});

export default router;
