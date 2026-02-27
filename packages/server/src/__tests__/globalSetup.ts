import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup() {
  process.env.DATABASE_URL = 'file:./prisma/test.db';
  process.env.JWT_SECRET = 'test_secret_do_not_use_in_prod';

  // __dirname is src/__tests__, so ../.. = packages/server (where prisma/ lives)
  const serverDir = path.resolve(__dirname, '../..');
  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    stdio: 'pipe',
  });
  console.log('\n[test] Test DB migrated ✓');
}
