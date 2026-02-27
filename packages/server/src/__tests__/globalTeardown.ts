import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown() {
  // __dirname is src/__tests__, so ../.. = packages/server
  const testDb = path.resolve(__dirname, '../../prisma/test.db');
  const testDbJournal = testDb + '-journal';
  if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  if (fs.existsSync(testDbJournal)) fs.unlinkSync(testDbJournal);
  console.log('\n[test] Test DB cleaned up ✓');
}
