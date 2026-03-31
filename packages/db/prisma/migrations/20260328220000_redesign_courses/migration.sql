-- Drop old tables that are being redesigned
DROP TABLE IF EXISTS "enrollments";
DROP TABLE IF EXISTS "attendances";

-- Alter courses: make departmentId optional, add isCommon
ALTER TABLE "courses" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "courses" DROP COLUMN IF EXISTS "semester";
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "isCommon" BOOLEAN NOT NULL DEFAULT false;

-- Create batch_courses (batch + course + faculty + semester)
CREATE TABLE "batch_courses" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "batchId"   TEXT NOT NULL,
  "courseId"  TEXT NOT NULL,
  "facultyId" TEXT,
  "semester"  INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "batch_courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_courses_batchId_courseId_semester_key"
  ON "batch_courses"("batchId", "courseId", "semester");
CREATE INDEX "batch_courses_tenantId_idx" ON "batch_courses"("tenantId");

ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "batch_courses"
  ADD CONSTRAINT "batch_courses_facultyId_fkey"
  FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate attendances linked to batch_courses
CREATE TABLE "attendances" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "studentId"     TEXT NOT NULL,
  "batchCourseId" TEXT NOT NULL,
  "date"          DATE NOT NULL,
  "status"        "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendances_studentId_batchCourseId_date_key"
  ON "attendances"("studentId", "batchCourseId", "date");
CREATE INDEX "attendances_tenantId_idx" ON "attendances"("tenantId");
CREATE INDEX "attendances_tenantId_batchCourseId_date_idx"
  ON "attendances"("tenantId", "batchCourseId", "date");

ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update assignments to use batchCourseId
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "courseId";
ALTER TABLE "assignments" ADD COLUMN "batchCourseId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update timetables to use batchCourseId
ALTER TABLE "timetables" DROP COLUMN IF EXISTS "courseId";
ALTER TABLE "timetables" DROP COLUMN IF EXISTS "facultyId";
ALTER TABLE "timetables" ADD COLUMN "batchCourseId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "timetables"
  ADD CONSTRAINT "timetables_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
