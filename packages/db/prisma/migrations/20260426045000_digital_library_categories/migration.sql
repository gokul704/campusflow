CREATE TABLE "digital_library_categories" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "digital_library_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_library_categories_tenantId_name_key"
  ON "digital_library_categories"("tenantId", "name");

CREATE INDEX "digital_library_categories_tenantId_createdAt_idx"
  ON "digital_library_categories"("tenantId", "createdAt");

ALTER TABLE "digital_library_categories"
  ADD CONSTRAINT "digital_library_categories_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_library_items"
  ADD COLUMN "categoryId" TEXT;

CREATE INDEX "digital_library_items_tenantId_categoryId_createdAt_idx"
  ON "digital_library_items"("tenantId", "categoryId", "createdAt");

ALTER TABLE "digital_library_items"
  ADD CONSTRAINT "digital_library_items_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "digital_library_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
