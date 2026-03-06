
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
  const oren = await prisma.user.findFirst({
    where: { name: 'אורן' }
  });

  if (!oren) {
    console.log('❌ User "אורן" NOT FOUND in database.');
    return;
  }

  const match = await bcrypt.compare('1234', oren.kidPin || '');
  console.log('--- User Info ---');
  console.log('Name:', oren.name);
  console.log('ID:', oren.id);
  console.log('Household ID:', oren.householdId);
  console.log('PIN Hash:', oren.kidPin);
  console.log('Matches "1234":', match ? '✅ YES' : '❌ NO');
  
  if (!match) {
    console.log('Attempting to fix PIN for אורן...');
    const fixedHash = await bcrypt.hash('1234', 10);
    await prisma.user.update({
      where: { id: oren.id },
      data: { kidPin: fixedHash }
    });
    console.log('✅ PIN fixed to "1234".');
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
