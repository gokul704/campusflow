-- Sections are removed from active batch-course assignment flow; keep sectionId as nullable legacy column.
ALTER TABLE "batch_courses"
  ALTER COLUMN "sectionId" DROP NOT NULL;
