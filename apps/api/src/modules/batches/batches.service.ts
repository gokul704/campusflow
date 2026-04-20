import { prisma } from "@campusflow/db";

export async function listBatches(tenantId: string) {
  return prisma.batch.findMany({
    where: { tenantId },
    include: { _count: { select: { students: true } } },
    orderBy: { startYear: "desc" },
  });
}

export async function createBatch(tenantId: string, name: string, startYear: number, endYear: number) {
  return prisma.batch.create({
    data: { tenantId, name, startYear, endYear },
  });
}

export async function updateBatch(tenantId: string, id: string, data: { name?: string; isActive?: boolean }) {
  const batch = await prisma.batch.findFirst({ where: { id, tenantId } });
  if (!batch) throw new Error("Batch not found");
  return prisma.batch.update({ where: { id }, data });
}

export async function deleteBatch(tenantId: string, id: string) {
  const batch = await prisma.batch.findFirst({ where: { id, tenantId } });
  if (!batch) throw new Error("Batch not found");
  const count = await prisma.student.count({ where: { batchId: id } });
  if (count > 0) throw new Error(`Cannot delete — ${count} students assigned to this batch`);
  return prisma.batch.delete({ where: { id } });
}

export async function bulkCreateBatches(
  tenantId: string,
  rows: { name: string; startYear: number; endYear: number }[]
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      await createBatch(tenantId, row.name.trim(), row.startYear, row.endYear);
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
