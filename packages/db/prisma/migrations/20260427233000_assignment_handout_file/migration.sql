-- Optional uploaded handout / question paper for an assignment (path under uploads/).
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
