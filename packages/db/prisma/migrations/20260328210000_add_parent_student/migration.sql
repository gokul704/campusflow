CREATE TABLE "parent_students" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "parentId"  TEXT NOT NULL,
  "studentId" TEXT NOT NULL,

  CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parent_students_parentId_studentId_key" ON "parent_students"("parentId", "studentId");
CREATE INDEX "parent_students_tenantId_idx" ON "parent_students"("tenantId");

ALTER TABLE "parent_students"
  ADD CONSTRAINT "parent_students_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "parent_students"
  ADD CONSTRAINT "parent_students_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
