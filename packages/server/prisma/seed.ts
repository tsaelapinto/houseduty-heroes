import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  // Upsert household
  const household = await prisma.household.upsert({
    where: { id: 'demo-household-001' },
    update: {},
    create: {
      id: 'demo-household-001',
      name: 'The Demo Family',
    },
  });

  // Upsert parent
  const parentHash = await bcrypt.hash('parent123', 10);
  const parent = await prisma.user.upsert({
    where: { email: 'mum@houseduty.app' },
    update: { passwordHash: parentHash },
    create: {
      id: 'demo-parent-001',
      householdId: household.id,
      name: 'Mum',
      role: 'PARENT',
      email: 'mum@houseduty.app',
      passwordHash: parentHash,
    },
  });

  // Upsert kids
  const pinHash = await bcrypt.hash('1234', 10);

  const daniel = await prisma.user.upsert({
    where: { id: 'demo-kid-daniel' },
    update: { kidPin: pinHash },
    create: {
      id: 'demo-kid-daniel',
      householdId: household.id,
      name: 'Daniel',
      role: 'KID',
      kidPin: pinHash,
    },
  });

  const maya = await prisma.user.upsert({
    where: { id: 'demo-kid-maya' },
    update: { kidPin: pinHash },
    create: {
      id: 'demo-kid-maya',
      householdId: household.id,
      name: 'Maya',
      role: 'KID',
      kidPin: pinHash,
    },
  });

  // Upsert duty templates
  const templates = [
    { id: 'tpl-001', name: 'Clear the Table' },
    { id: 'tpl-002', name: 'Feed the Dog' },
    { id: 'tpl-003', name: 'Make the Bed' },
    { id: 'tpl-004', name: 'Take Out Trash' },
  ];

  for (const tpl of templates) {
    await prisma.dutyTemplate.upsert({
      where: { id: tpl.id },
      update: {},
      create: {
        id: tpl.id,
        householdId: household.id,
        name: tpl.name,
        defaultPoints: 10,
        isActive: true,
        isPrebuilt: true,
      },
    });
  }

  // Upsert a cycle that covers today
  const today = new Date();
  const startAt = new Date(today);
  startAt.setHours(0, 0, 0, 0);
  const endAt = new Date(today);
  endAt.setDate(endAt.getDate() + 6);
  endAt.setHours(23, 59, 59, 999);

  const cycle = await prisma.cycle.upsert({
    where: { id: 'demo-cycle-001' },
    update: {},
    create: {
      id: 'demo-cycle-001',
      householdId: household.id,
      startAt,
      endAt,
      status: 'ACTIVE',
    },
  });

  // Assign duties for Daniel today
  const dutyDate = new Date();
  dutyDate.setHours(12, 0, 0, 0);

  for (let i = 0; i < 2; i++) {
    const dutyId = `demo-duty-daniel-00${i + 1}`;
    await prisma.dutyInstance.upsert({
      where: { id: dutyId },
      update: {},
      create: {
        id: dutyId,
        cycleId: cycle.id,
        templateId: templates[i].id,
        kidId: daniel.id,
        date: dutyDate,
        status: 'ASSIGNED',
      },
    });
  }

  // Assign a duty for Maya today
  await prisma.dutyInstance.upsert({
    where: { id: 'demo-duty-maya-001' },
    update: {},
    create: {
      id: 'demo-duty-maya-001',
      cycleId: cycle.id,
      templateId: templates[2].id,
      kidId: maya.id,
      date: dutyDate,
      status: 'ASSIGNED',
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Parent: mum@houseduty.app / parent123`);
  console.log(`   Kids: Daniel / 1234, Maya / 1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
