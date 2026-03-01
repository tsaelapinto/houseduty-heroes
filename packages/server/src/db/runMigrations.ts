import prisma from './client';

/**
 * Idempotent schema migrations — safe to run on every startup.
 * Uses IF NOT EXISTS so re-runs are harmless.
 */
export async function runMigrations(): Promise<void> {
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') ||
                     process.env.DATABASE_URL?.startsWith('postgres');
  try {
    if (isPostgres) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "HouseholdInvite" (
          "id"          TEXT        NOT NULL,
          "householdId" TEXT        NOT NULL,
          "token"       TEXT        NOT NULL,
          "createdById" TEXT        NOT NULL,
          "expiresAt"   TIMESTAMPTZ NOT NULL,
          "usedAt"      TIMESTAMPTZ,
          "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "HouseholdInvite_householdId_fkey"
            FOREIGN KEY ("householdId") REFERENCES "Household"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdInvite_token_key" ON "HouseholdInvite"("token")`
      );
    } else {
      // SQLite (local dev)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "HouseholdInvite" (
          "id"          TEXT     NOT NULL PRIMARY KEY,
          "householdId" TEXT     NOT NULL,
          "token"       TEXT     NOT NULL,
          "createdById" TEXT     NOT NULL,
          "expiresAt"   DATETIME NOT NULL,
          "usedAt"      DATETIME,
          "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("householdId") REFERENCES "Household"("id")
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdInvite_token_key" ON "HouseholdInvite"("token")`
      );
    }
    console.log('[db] Schema migrations applied ✓');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      console.warn('[db] Migration warning:', e.message);
    }
  }
}
