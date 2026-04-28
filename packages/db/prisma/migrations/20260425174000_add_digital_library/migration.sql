CREATE TABLE "digital_library_items" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "filePath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "digital_library_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "digital_library_items_tenantId_createdAt_idx"
  ON "digital_library_items"("tenantId", "createdAt");

ALTER TABLE "digital_library_items"
  ADD CONSTRAINT "digital_library_items_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_library_items"
  ADD CONSTRAINT "digital_library_items_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
