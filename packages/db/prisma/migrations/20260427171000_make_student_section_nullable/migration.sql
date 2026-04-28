-- Sections are removed from active student flow; keep column as nullable legacy.
ALTER TABLE "students"
  ALTER COLUMN "sectionId" DROP NOT NULL;
