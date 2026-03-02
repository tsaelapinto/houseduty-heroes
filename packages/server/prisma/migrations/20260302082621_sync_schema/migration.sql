-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cycleFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem'
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'KID',
    "avatarSlug" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT,
    "passwordHash" TEXT,
    "kidPin" TEXT,
    "morningReminderTime" TEXT,
    "eveningReminderTime" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "defaultPoints" INTEGER NOT NULL DEFAULT 10,
    "recurrence" TEXT NOT NULL DEFAULT 'daily',
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrebuilt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DutyTemplate_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyTemplateAllowedKid" (
    "templateId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,

    PRIMARY KEY ("templateId", "kidId"),
    CONSTRAINT "DutyTemplateAllowedKid_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DutyTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cycle_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "templateId" TEXT,
    "kidId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "nameOverride" TEXT,
    "pointsOverride" INTEGER,
    "photoRequiredOverride" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DutyInstance_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DutyInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DutyTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DutyInstance_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dutyInstanceId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncPending" BOOLEAN NOT NULL DEFAULT false,
    "photoAssetId" TEXT,
    CONSTRAINT "Submission_dutyInstanceId_fkey" FOREIGN KEY ("dutyInstanceId") REFERENCES "DutyInstance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "PhotoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dutyInstanceId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsAwarded" INTEGER NOT NULL,
    CONSTRAINT "Approval_dutyInstanceId_fkey" FOREIGN KEY ("dutyInstanceId") REFERENCES "DutyInstance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageProvider" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnlockableItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "UserUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserUnlock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "UnlockableItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseholdInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- CreateIndex
CREATE INDEX "DutyTemplate_householdId_idx" ON "DutyTemplate"("householdId");

-- CreateIndex
CREATE INDEX "Cycle_householdId_idx" ON "Cycle"("householdId");

-- CreateIndex
CREATE INDEX "DutyInstance_cycleId_idx" ON "DutyInstance"("cycleId");

-- CreateIndex
CREATE INDEX "DutyInstance_kidId_idx" ON "DutyInstance"("kidId");

-- CreateIndex
CREATE INDEX "DutyInstance_date_idx" ON "DutyInstance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_dutyInstanceId_key" ON "Submission"("dutyInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_dutyInstanceId_key" ON "Approval"("dutyInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockableItem_slug_key" ON "UnlockableItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserUnlock_userId_itemId_key" ON "UserUnlock"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvite_token_key" ON "HouseholdInvite"("token");
