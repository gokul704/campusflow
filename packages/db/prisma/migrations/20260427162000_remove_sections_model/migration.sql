-- Remove section foreign keys first, then drop sections table.
ALTER TABLE "batch_courses" DROP CONSTRAINT IF EXISTS "batch_courses_sectionId_fkey";
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_sectionId_fkey";
ALTER TABLE "fee_structures" DROP CONSTRAINT IF EXISTS "fee_structures_sectionId_fkey";

DROP TABLE IF EXISTS "sections" CASCADE;
