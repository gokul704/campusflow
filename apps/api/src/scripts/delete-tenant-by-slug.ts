#!/usr/bin/env tsx
/**
 * Hard-delete one institute and all tenant-scoped rows (standalone cleanup).
 *
 *   npm run delete-tenant --workspace=@campusflow/api -- --slug=maa-ish
 *   npm run api:delete-tenant -- --slug=maa-ish
 */

import { prisma } from "@campusflow/db";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    args[key] = rest.join("=");
  }
  return args;
}

async function main() {
  const slug = parseArgs()["slug"]?.trim();
  if (!slug) {
    console.error("Usage: npm run api:delete-tenant -- --slug=tenant-slug-to-remove");
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.log(`No tenant with slug "${slug}" — nothing to delete.`);
    return;
  }

  const tid = tenant.id;
  console.log(`Deleting tenant "${slug}" (${tenant.name}) and all related data…`);

  await prisma.$transaction(
    async (tx) => {
      await tx.notification.deleteMany({ where: { tenantId: tid } });
      await tx.submission.deleteMany({ where: { tenantId: tid } });
      await tx.assignment.deleteMany({ where: { tenantId: tid } });
      await tx.attendance.deleteMany({ where: { tenantId: tid } });
      await tx.examGrade.deleteMany({ where: { tenantId: tid } });
      await tx.timetable.deleteMany({ where: { tenantId: tid } });
      await tx.feePayment.deleteMany({ where: { tenantId: tid } });
      await tx.batchCourse.deleteMany({ where: { tenantId: tid } });
      await tx.student.deleteMany({ where: { tenantId: tid } });
      await tx.faculty.deleteMany({ where: { tenantId: tid } });
      await tx.user.deleteMany({ where: { tenantId: tid } });
      await tx.course.deleteMany({ where: { tenantId: tid } });
      await tx.batch.deleteMany({ where: { tenantId: tid } });
      await tx.feeStructure.deleteMany({ where: { tenantId: tid } });
      await tx.department.deleteMany({ where: { tenantId: tid } });
      await tx.event.deleteMany({ where: { tenantId: tid } });
      await tx.tenant.delete({ where: { id: tid } });
    },
    { timeout: 120_000, maxWait: 30_000 }
  );

  console.log(`✅ Removed tenant "${slug}".`);
}

main()
  .catch((e) => {
    console.error("❌ delete-tenant failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
