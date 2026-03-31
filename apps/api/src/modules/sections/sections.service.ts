import { prisma } from "@campusflow/db";

export async function listSections(tenantId: string, batchId?: string) {
  return prisma.section.findMany({
    where: { tenantId, ...(batchId ? { batchId } : {}) },
    include: { batch: { select: { name: true } }, _count: { select: { students: true } } },
    orderBy: [{ batch: { startYear: "desc" } }, { name: "asc" }],
  });
}

export async function createSection(tenantId: string, batchId: string, name: string) {
  return prisma.section.create({
    data: { tenantId, batchId, name: name.toUpperCase() },
    include: { batch: { select: { name: true } }, _count: { select: { students: true } } },
  });
}

export async function deleteSection(tenantId: string, id: string) {
  const section = await prisma.section.findFirst({ where: { id, tenantId } });
  if (!section) throw new Error("Section not found");
  const count = await prisma.student.count({ where: { sectionId: id } });
  if (count > 0) throw new Error(`Cannot delete — ${count} students assigned`);
  return prisma.section.delete({ where: { id } });
}
