import { prisma } from "@campusflow/db";

export async function listDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(tenantId: string, name: string, code: string) {
  const existing = await prisma.department.findUnique({
    where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
  });
  if (existing) throw new Error("Department code already exists");

  return prisma.department.create({
    data: { tenantId, name, code: code.toUpperCase() },
  });
}

export async function updateDepartment(tenantId: string, id: string, data: { name?: string; code?: string }) {
  const dept = await prisma.department.findFirst({ where: { id, tenantId } });
  if (!dept) throw new Error("Department not found");

  return prisma.department.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.code && { code: data.code.toUpperCase() }),
    },
  });
}

export async function deleteDepartment(tenantId: string, id: string) {
  const dept = await prisma.department.findFirst({ where: { id, tenantId } });
  if (!dept) throw new Error("Department not found");

  return prisma.department.delete({ where: { id } });
}
