import prisma from './client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seed started...');

  // 1. Create Household
  const household = await prisma.household.create({
    data: {
      name: 'Happy Home',
    },
  });

  // 2. Create Parent (with real bcrypt hash)
  const parent = await prisma.user.create({
    data: {
      householdId: household.id,
      name: 'Mum',
      role: 'PARENT',
      email: 'mum@houseduty.app',
      passwordHash: await bcrypt.hash('parent123', 10),
    },
  });

  // 3. Create Kids (with real bcrypt-hashed PINs)
  const kidPinHash = await bcrypt.hash('1234', 10);
  const daniel = await prisma.user.create({
    data: {
      householdId: household.id,
      name: 'Daniel',
      role: 'KID',
      avatarSlug: 'super-rocket',
      kidPin: kidPinHash,
    },
  });

  const maya = await prisma.user.create({
    data: {
      householdId: household.id,
      name: 'Maya',
      role: 'KID',
      avatarSlug: 'robo-cat',
      kidPin: kidPinHash,
    },
  });

  // 4. Create Duty Templates
  const templates = await Promise.all([
    prisma.dutyTemplate.create({
      data: {
        householdId: household.id,
        name: 'Clear the Table',
        defaultPoints: 10,
      },
    }),
    prisma.dutyTemplate.create({
      data: {
        householdId: household.id,
        name: 'Feed the Dog',
        defaultPoints: 15,
      },
    }),
    prisma.dutyTemplate.create({
      data: {
        householdId: household.id,
        name: 'Make the Bed',
        defaultPoints: 5,
      },
    }),
  ]);

  // 5. Create Active Cycle
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);

  const cycle = await prisma.cycle.create({
    data: {
      householdId: household.id,
      startAt: today,
      endAt: weekFromNow,
      status: 'ACTIVE',
    },
  });

  // 6. Create 3 Active Duty Instances for Today
  await prisma.dutyInstance.createMany({
    data: [
      {
        cycleId: cycle.id,
        templateId: templates[0].id,
        kidId: daniel.id,
        date: today,
        status: 'ASSIGNED',
      },
      {
        cycleId: cycle.id,
        templateId: templates[1].id,
        kidId: maya.id,
        date: today,
        status: 'ASSIGNED',
      },
      {
        cycleId: cycle.id,
        templateId: templates[2].id,
        kidId: daniel.id,
        date: today,
        status: 'ASSIGNED',
      },
    ],
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
