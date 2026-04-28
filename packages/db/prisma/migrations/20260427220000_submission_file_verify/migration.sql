-- Submission file on disk + faculty verification timestamps
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT;

-- Link submissions to students for Prisma includes (safe if already present)
DO $$
BEGIN
  ALTER TABLE "submissions"
    ADD CONSTRAINT "submissions_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
