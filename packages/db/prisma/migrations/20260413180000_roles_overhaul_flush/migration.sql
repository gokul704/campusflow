-- Flush tenant data and replace Role enum with MAA Education portal roles.
-- Removes legacy parent_students (parent portal role removed).

DROP TABLE IF EXISTS "parent_students" CASCADE;

TRUNCATE TABLE "site_counters" RESTART IDENTITY;

TRUNCATE TABLE "tenants" CASCADE;

-- Replace PostgreSQL Role enum (users table is empty after CASCADE).
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING ("role"::text);

DROP TYPE "Role";

CREATE TYPE "Role" AS ENUM (
  'ADMIN',
  'CMD',
  'PRINCIPAL',
  'STAFF',
  'OPERATIONS_LECTURER',
  'OPERATIONS_HR',
  'OPERATIONS_FRONT_DESK',
  'PRESENT_STUDENT',
  'ALUMNI',
  'GUEST_STUDENT'
);

ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING 'PRESENT_STUDENT'::"Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PRESENT_STUDENT'::"Role";
