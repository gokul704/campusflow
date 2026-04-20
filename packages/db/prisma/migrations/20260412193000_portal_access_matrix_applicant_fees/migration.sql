-- Tenant RBAC matrix (JSON blob)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "accessMatrix" JSONB;

-- Portal / fee override on users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "portalAccessRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "portalRestrictionReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "feeAccessOverrideUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "feeAccessOverrideByUserId" TEXT;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_feeAccessOverrideByUserId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_feeAccessOverrideByUserId_fkey"
  FOREIGN KEY ("feeAccessOverrideByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Admission flag on fee structures
ALTER TABLE "fee_structures" ADD COLUMN IF NOT EXISTS "isAdmissionFee" BOOLEAN NOT NULL DEFAULT false;

-- Applicant fee payments (nullable student; optional applicant user)
ALTER TABLE "fee_payments" DROP CONSTRAINT IF EXISTS "fee_payments_studentId_fkey";
ALTER TABLE "fee_payments" ALTER COLUMN "studentId" DROP NOT NULL;

ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "applicantUserId" TEXT;

ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_applicantUserId_fkey"
  FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "fee_payments_applicantUserId_idx" ON "fee_payments"("applicantUserId");
