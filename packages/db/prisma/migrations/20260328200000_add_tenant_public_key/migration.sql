-- Add publicKey as nullable first (existing rows need a value)
ALTER TABLE "tenants" ADD COLUMN "publicKey" TEXT;

-- Generate a UUID for any existing rows
UPDATE "tenants" SET "publicKey" = gen_random_uuid()::TEXT WHERE "publicKey" IS NULL;

-- Now make it required and unique
ALTER TABLE "tenants" ALTER COLUMN "publicKey" SET NOT NULL;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_publicKey_key" UNIQUE ("publicKey");
