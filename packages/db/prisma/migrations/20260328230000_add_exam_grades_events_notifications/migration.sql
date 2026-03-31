-- Create EventType enum
CREATE TYPE "EventType" AS ENUM ('EVENT', 'WORKSHOP', 'HOLIDAY', 'EXAM', 'ASSIGNMENT_DUE');

-- Create exam_grades table
CREATE TABLE "exam_grades" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "studentId"     TEXT NOT NULL,
  "batchCourseId" TEXT NOT NULL,
  "examType"      TEXT NOT NULL,
  "marks"         DOUBLE PRECISION NOT NULL,
  "maxMarks"      DOUBLE PRECISION NOT NULL DEFAULT 100,
  "remarks"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "exam_grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_grades_studentId_batchCourseId_examType_key"
  ON "exam_grades"("studentId", "batchCourseId", "examType");
CREATE INDEX "exam_grades_tenantId_idx" ON "exam_grades"("tenantId");

ALTER TABLE "exam_grades"
  ADD CONSTRAINT "exam_grades_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_grades"
  ADD CONSTRAINT "exam_grades_batchCourseId_fkey"
  FOREIGN KEY ("batchCourseId") REFERENCES "batch_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create events table
CREATE TABLE "events" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "startDate"   TIMESTAMP(3) NOT NULL,
  "endDate"     TIMESTAMP(3),
  "eventType"   "EventType" NOT NULL DEFAULT 'EVENT',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "events_tenantId_idx" ON "events"("tenantId");

ALTER TABLE "events"
  ADD CONSTRAINT "events_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create notifications table
CREATE TABLE "notifications" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "link"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_tenantId_userId_idx" ON "notifications"("tenantId", "userId");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
