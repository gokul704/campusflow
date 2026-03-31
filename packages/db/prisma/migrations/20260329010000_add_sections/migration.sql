-- 1. Create sections table
CREATE TABLE "sections" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "batchId"   TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sections_batchId_name_key" ON "sections"("batchId", "name");
CREATE INDEX "sections_tenantId_idx" ON "sections"("tenantId");

ALTER TABLE "sections"
  ADD CONSTRAINT "sections_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sections"
  ADD CONSTRAINT "sections_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Create default "A" section for each existing batch
INSERT INTO "sections" ("id", "tenantId", "batchId", "name")
SELECT
  'sec_' || "id" || '_A',
  "tenantId",
  "id",
  'A'
FROM "batches";

-- 3. Add sectionId to students (nullable first)
ALTER TABLE "students" ADD COLUMN "sectionId" TEXT;

-- 4. Populate sectionId for existing students → assign to section "A" of their batch
UPDATE "students" s
SET "sectionId" = sec."id"
FROM "sections" sec
WHERE sec."batchId" = s."batchId" AND sec."name" = 'A';

-- 5. Make sectionId NOT NULL
ALTER TABLE "students" ALTER COLUMN "sectionId" SET NOT NULL;

-- 6. Add FK + index
ALTER TABLE "students"
  ADD CONSTRAINT "students_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "students_sectionId_idx" ON "students"("sectionId");

-- 7. Add sectionId to batch_courses (nullable first)
ALTER TABLE "batch_courses" ADD COLUMN "sectionId" TEXT;

-- 8. Populate sectionId for existing batch_courses → assign to section "A" of their batch
UPDATE "batch_courses" bc
SET "sectionId" = sec."id"
FROM "sections" sec
WHERE sec."batchId" = bc."batchId" AND sec."name" = 'A';

-- 9. Make sectionId NOT NULL
ALTER TABLE "batch_courses" ALTER COLUMN "sectionId" SET NOT NULL;

-- 10. Add FK
ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. Drop old unique constraint and create new one (section-aware)
ALTER TABLE "batch_courses" DROP CONSTRAINT IF EXISTS "batch_courses_batchId_courseId_semester_key";
CREATE UNIQUE INDEX "batch_courses_sectionId_courseId_semester_key" ON "batch_courses"("sectionId", "courseId", "semester");

-- 12. Add index for batch+semester queries
CREATE INDEX "batch_courses_batchId_semester_idx" ON "batch_courses"("batchId", "semester");
