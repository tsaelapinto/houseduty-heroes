-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'KID',
    "avatarSlug" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT,
    "passwordHash" TEXT,
    "kidPin" TEXT,
    "morningReminderTime" TEXT,
    "eveningReminderTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyTemplate" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPoints" INTEGER NOT NULL DEFAULT 10,
    "recurrence" TEXT NOT NULL DEFAULT 'daily',
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrebuilt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyTemplateAllowedKid" (
    "templateId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,

    CONSTRAINT "DutyTemplateAllowedKid_pkey" PRIMARY KEY ("templateId","kidId")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyInstance" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "templateId" TEXT,
    "kidId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nameOverride" TEXT,
    "pointsOverride" INTEGER,
    "photoRequiredOverride" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "dutyInstanceId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncPending" BOOLEAN NOT NULL DEFAULT false,
    "photoAssetId" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "dutyInstanceId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsAwarded" INTEGER NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAsset" (
    "id" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockableItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnlockableItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserUnlock_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyTemplate" ADD CONSTRAINT "DutyTemplate_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyTemplateAllowedKid" ADD CONSTRAINT "DutyTemplateAllowedKid_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DutyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyInstance" ADD CONSTRAINT "DutyInstance_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyInstance" ADD CONSTRAINT "DutyInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DutyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyInstance" ADD CONSTRAINT "DutyInstance_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_dutyInstanceId_fkey" FOREIGN KEY ("dutyInstanceId") REFERENCES "DutyInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "PhotoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_dutyInstanceId_fkey" FOREIGN KEY ("dutyInstanceId") REFERENCES "DutyInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnlock" ADD CONSTRAINT "UserUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnlock" ADD CONSTRAINT "UserUnlock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "UnlockableItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
