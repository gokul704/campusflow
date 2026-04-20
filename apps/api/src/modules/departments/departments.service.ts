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

  const [facultyCount, courseCount] = await Promise.all([
    prisma.faculty.count({ where: { departmentId: id, tenantId } }),
    prisma.course.count({ where: { departmentId: id, tenantId } }),
  ]);
  if (facultyCount > 0) {
    throw new Error(
      `Cannot delete this department — ${facultyCount} faculty profile(s) still use it. Reassign those faculty to another department first.`
    );
  }
  if (courseCount > 0) {
    throw new Error(
      `Cannot delete this department — ${courseCount} course(s) still belong to it. Remove or reassign those courses first.`
    );
  }

  return prisma.department.delete({ where: { id } });
}

export async function bulkCreateDepartments(tenantId: string, rows: { name: string; code: string }[]) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      await createDepartment(tenantId, row.name.trim(), row.code.trim());
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
