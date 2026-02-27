import prisma from '../db/client';
import bcrypt from 'bcryptjs';

export async function seedTestData() {
  // Clean slate - delete in FK-safe order
  await prisma.approval.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.dutyInstance.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.dutyTemplate.deleteMany();
  await prisma.userUnlock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();

  const household = await prisma.household.create({ data: { name: 'Test Family' } });

  const parentHash = await bcrypt.hash('parent123', 10);
  const kidHash = await bcrypt.hash('1234', 10);

  const parent = await prisma.user.create({
    data: {
      householdId: household.id,
      name: 'TestMum',
      role: 'PARENT',
      email: 'testmum@test.com',
      passwordHash: parentHash,
    },
  });

  const kid = await prisma.user.create({
    data: {
      householdId: household.id,
      name: 'TestKid',
      role: 'KID',
      avatarSlug: 'super-rocket',
      kidPin: kidHash,
    },
  });

  const template = await prisma.dutyTemplate.create({
    data: { householdId: household.id, name: 'Clear the Table', defaultPoints: 10, isActive: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const cycle = await prisma.cycle.create({
    data: { householdId: household.id, startAt: today, endAt: weekEnd, status: 'ACTIVE' },
  });

  const duty = await prisma.dutyInstance.create({
    data: { cycleId: cycle.id, templateId: template.id, kidId: kid.id, date: today, status: 'ASSIGNED' },
  });

  return { household, parent, kid, template, cycle, duty };
}

export async function cleanTestData() {
  // Delete in FK-safe order (children before parents)
  await prisma.approval.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.dutyInstance.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.dutyTemplate.deleteMany();
  await prisma.userUnlock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();
}
