-- Drop old unique index/constraint on batch_courses (batchId, courseId, semester)
DROP INDEX IF EXISTS "batch_courses_batchId_courseId_semester_key";

-- Also try constraint name format
ALTER TABLE "batch_courses" DROP CONSTRAINT IF EXISTS "batch_courses_batchId_courseId_semester_key";

-- Verify the new one exists
-- CREATE UNIQUE INDEX IF NOT EXISTS "batch_courses_sectionId_courseId_semester_key" ON "batch_courses"("sectionId", "courseId", "semester");
