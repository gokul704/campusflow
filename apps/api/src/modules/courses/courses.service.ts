import { prisma } from "@campusflow/db";
import { resolveDepartmentId } from "../../lib/bulkImportResolvers";

export async function listCourses(tenantId: string, departmentId?: string) {
  return prisma.course.findMany({
    where: { tenantId, ...(departmentId ? { departmentId } : {}) },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { batchCourses: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCourse(
  tenantId: string,
  data: { name: string; code: string; departmentId?: string; credits: number; isCommon?: boolean }
) {
  const existing = await prisma.course.findUnique({ where: { tenantId_code: { tenantId, code: data.code.toUpperCase() } } });
  if (existing) throw new Error("Course code already exists");

  return prisma.course.create({
    data: { tenantId, ...data, code: data.code.toUpperCase() },
    include: { department: { select: { name: true, code: true } } },
  });
}

export async function updateCourse(
  tenantId: string,
  id: string,
  data: { name?: string; credits?: number; isCommon?: boolean; departmentId?: string | null }
) {
  const course = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!course) throw new Error("Course not found");
  return prisma.course.update({ where: { id }, data });
}

export async function deleteCourse(tenantId: string, id: string) {
  const course = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!course) throw new Error("Course not found");
  const bcCount = await prisma.batchCourse.count({ where: { courseId: id } });
  if (bcCount > 0) throw new Error(`Cannot delete — course assigned to ${bcCount} batch(es)`);
  return prisma.course.delete({ where: { id } });
}

export async function bulkCreateCourses(
  tenantId: string,
  rows: Array<{
    name: string;
    code: string;
    credits: number;
    isCommon?: boolean;
    departmentId?: string | null;
    departmentCode?: string | null;
    departmentName?: string | null;
  }>
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const departmentId = await resolveDepartmentId(
        tenantId,
        {
          departmentId: row.departmentId,
          departmentCode: row.departmentCode,
          departmentName: row.departmentName,
        },
        false
      );
      await createCourse(tenantId, {
        name: row.name.trim(),
        code: row.code.trim(),
        credits: row.credits,
        isCommon: row.isCommon ?? false,
        ...(departmentId ? { departmentId } : {}),
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
