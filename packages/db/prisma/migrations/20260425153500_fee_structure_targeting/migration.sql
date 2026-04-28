-- Add optional targeting fields so fee structures can be mapped to enrollment.
ALTER TABLE "fee_structures"
  ADD COLUMN "batchId" TEXT,
  ADD COLUMN "sectionId" TEXT;

ALTER TABLE "fee_structures"
  ADD CONSTRAINT "fee_structures_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fee_structures"
  ADD CONSTRAINT "fee_structures_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "sections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "fee_structures_tenantId_batchId_sectionId_idx"
  ON "fee_structures"("tenantId", "batchId", "sectionId");
