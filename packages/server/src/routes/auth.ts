import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const signToken = (userId: string) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

// ─── Parent / Kid Login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, pin, role } = req.body;
    if (!email || !pin || !role) {
      return res.status(400).json({ error: 'email, pin and role are required' });
    }

    if (role === 'PARENT') {
      const user = await prisma.user.findUnique({ where: { email: String(email) } });
      if (!user || user.role !== 'PARENT' || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const ok = await bcrypt.compare(String(pin), user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const { passwordHash, kidPin, ...safe } = user;
      return res.json({ user: safe, token: signToken(user.id) });
    } else {
      // Kid login: find by name, then check PIN
      const candidates = await prisma.user.findMany({
        where: { name: { equals: String(email) }, role: 'KID' },
      });
      for (const kid of candidates) {
        if (kid.kidPin && await bcrypt.compare(String(pin), kid.kidPin)) {
          const { passwordHash, kidPin: kp, ...safe } = kid;
          return res.json({ user: safe, token: signToken(kid.id) });
        }
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Register Parent ──────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, householdName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const household = await prisma.household.create({ data: { name: householdName || `${name}'s Household` } });
    // Seed OOTB duty templates for the new household
    const OOTB_DUTIES = [
      { name: 'Make bed', defaultPoints: 10 }, { name: 'Set the table', defaultPoints: 10 },
      { name: 'Clear the table', defaultPoints: 15 }, { name: 'Take out trash', defaultPoints: 15 },
      { name: 'Sweep the floor', defaultPoints: 15 }, { name: 'Feed the pet', defaultPoints: 15 },
      { name: 'Load dishwasher', defaultPoints: 15 }, { name: 'Wash dishes', defaultPoints: 20 },
      { name: 'Tidy bedroom', defaultPoints: 20 }, { name: 'Fold laundry', defaultPoints: 20 },
      { name: 'Vacuum living room', defaultPoints: 25 }, { name: 'Walk the dog', defaultPoints: 25 },
    ];
    await prisma.dutyTemplate.createMany({
      data: OOTB_DUTIES.map(d => ({ ...d, householdId: household.id, isActive: true })),
    });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: { householdId: household.id, name, role: 'PARENT', email, passwordHash },
    });
    const { passwordHash: _, kidPin: __, ...safe } = user;
    return res.status(201).json({ user: safe, token: signToken(user.id) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// ─── Add Kid (called by logged-in parent) ─────────────────────────────────
router.post('/add-kid', async (req, res) => {
  try {
    const { name, pin, householdId, avatarSlug } = req.body;
    if (!name || !pin || !householdId) {
      return res.status(400).json({ error: 'name, pin and householdId are required' });
    }
    const kidPin = await bcrypt.hash(String(pin), 10);
    const kid = await prisma.user.create({
      data: { householdId, name, role: 'KID', kidPin, avatarSlug: avatarSlug || 'default' },
    });
    const { kidPin: _, passwordHash: __, ...safe } = kid;
    return res.status(201).json({ user: safe });
  } catch (err) {
    console.error('Add kid error:', err);
    return res.status(500).json({ error: 'Server error adding hero' });
  }
});

// ─── /me ────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, kidPin, ...safe } = user;
    return res.json({ user: safe });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── Update own profile (name / password) ────────────────────────────────
router.patch('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    const { name, password } = req.body as { name?: string; password?: string };
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (password) updates.passwordHash = await bcrypt.hash(String(password), 10);
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Nothing to update' });
    const updated = await prisma.user.update({ where: { id: userId }, data: updates });
    const { passwordHash, kidPin, ...safe } = updated;
    return res.json({ user: safe });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── Join via invite link ────────────────────────────────────────────────────
router.post('/join', async (req, res) => {
  try {
    const { name, email, password, inviteToken } = req.body;
    if (!name || !email || !password || !inviteToken)
      return res.status(400).json({ error: 'name, email, password and inviteToken are required' });

    const invite = await (prisma as any).householdInvite.findUnique({ where: { token: String(inviteToken) } });
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'This invite has expired' });
    if (invite.usedAt) return res.status(409).json({ error: 'This invite has already been used' });

    const existing = await prisma.user.findUnique({ where: { email: String(email) } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: { householdId: invite.householdId, name: String(name), role: 'PARENT', email: String(email), passwordHash },
    });
    await (prisma as any).householdInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
    const { passwordHash: _, kidPin: __, ...safe } = user;
    return res.status(201).json({ user: safe, token: signToken(user.id) });
  } catch (err) {
    console.error('Join error:', err);
    return res.status(500).json({ error: 'Server error during join' });
  }
});

export default router;

