-- Move from legacy technical roles to business role names.
-- We recreate enum type because PostgreSQL enums cannot safely remove values in-place.

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM (
  'ADMIN',
  'CMD',
  'PRINCIPAL',
  'ASSISTANT_PROFESSOR',
  'PROFESSOR',
  'CLINICAL_STAFF',
  'GUEST_PROFESSOR',
  'OPERATIONS',
  'ACCOUNTS',
  'IT_STAFF',
  'STUDENT',
  'ALUMNI',
  'GUEST_STUDENT'
);

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'STAFF' THEN 'ASSISTANT_PROFESSOR'
      WHEN 'OPERATIONS_LECTURER' THEN 'ASSISTANT_PROFESSOR'
      WHEN 'OPERATIONS_HR' THEN 'OPERATIONS'
      WHEN 'CASHIER' THEN 'ACCOUNTS'
      WHEN 'OPERATIONS_FRONT_DESK' THEN 'IT_STAFF'
      WHEN 'PRESENT_STUDENT' THEN 'STUDENT'
      ELSE "role"::text
    END
  )::"Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"Role";

DROP TYPE "Role_old";
