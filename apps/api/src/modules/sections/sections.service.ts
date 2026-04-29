import { prisma } from "@campusflow/db";

export async function listSections(tenantId: string, batchId?: string) {
  const rows = await prisma.student.groupBy({
    by: ["sectionId", "batchId"],
    where: {
      tenantId,
      sectionId: { not: null },
      ...(batchId ? { batchId } : {}),
    },
    _count: { _all: true },
    orderBy: [{ batchId: "asc" }, { sectionId: "asc" }],
  });
  return rows.map((row) => ({
    id: row.sectionId,
    name: row.sectionId,
    batchId: row.batchId,
    _count: { students: row._count._all },
  }));
}

export async function createSection(tenantId: string, batchId: string, name: string) {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, tenantId }, select: { id: true } });
  if (!batch) throw new Error("Batch not found");
  return {
    id: name.toUpperCase(),
    name: name.toUpperCase(),
    batchId,
    _count: { students: 0 },
    message: "Section records are legacy-only; this endpoint returns a placeholder without persisting.",
  };
}

export async function deleteSection(tenantId: string, id: string) {
  const count = await prisma.student.count({ where: { tenantId, sectionId: id } });
  if (count > 0) throw new Error(`Cannot delete — ${count} students assigned`);
  return { message: "No section model exists in current schema; nothing to delete." };
}
