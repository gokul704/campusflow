import { prisma } from "@campusflow/db";
import { resolveBatchCourseCreateIds } from "../../lib/bulkImportResolvers";

const batchCourseInclude = {
  batch: { select: { name: true } },
  section: { select: { name: true } },
  course: { select: { name: true, code: true } },
  faculty: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
};

export async function listBatchCourses(
  tenantId: string,
  filters: { batchId?: string; sectionId?: string; semester?: number }
) {
  return prisma.batchCourse.findMany({
    where: {
      tenantId,
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.semester ? { semester: filters.semester } : {}),
    },
    include: batchCourseInclude,
    // Order by semester + id — avoids fragile nested relation sort across Prisma versions
    orderBy: [{ semester: "asc" }, { id: "asc" }],
  });
}

export async function createBatchCourse(
  tenantId: string,
  data: { batchId: string; sectionId: string; courseId: string; semester: number; facultyId?: string }
) {
  try {
    return await prisma.batchCourse.create({
      data: { tenantId, ...data },
      include: batchCourseInclude,
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error("Already assigned — this course already exists for this section and semester");
    }
    throw e;
  }
}

export async function updateBatchCourse(
  tenantId: string,
  id: string,
  data: { facultyId?: string | null }
) {
  const record = await prisma.batchCourse.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("BatchCourse not found");
  return prisma.batchCourse.update({
    where: { id },
    data,
    include: batchCourseInclude,
  });
}

export async function deleteBatchCourse(tenantId: string, id: string) {
  const record = await prisma.batchCourse.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("BatchCourse not found");

  const attendanceCount = await prisma.attendance.count({ where: { batchCourseId: id } });
  if (attendanceCount > 0) {
    throw new Error(`Cannot delete — ${attendanceCount} attendance records exist for this batch course`);
  }

  const assignmentCount = await prisma.assignment.count({ where: { batchCourseId: id } });
  if (assignmentCount > 0) {
    throw new Error(`Cannot delete — ${assignmentCount} assignments exist for this batch course`);
  }

  return prisma.batchCourse.delete({ where: { id } });
}

export async function bulkCreateBatchCourses(
  tenantId: string,
  rows: Array<{
    batchCourseId?: string | null;
    batchId?: string | null;
    sectionId?: string | null;
    batchName?: string | null;
    sectionName?: string | null;
    courseCode?: string | null;
    courseId?: string | null;
    semester: number;
    facultyId?: string | null;
    facultyEmail?: string | null;
  }>
) {
  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const ids = await resolveBatchCourseCreateIds(tenantId, row);
      await createBatchCourse(tenantId, {
        batchId: ids.batchId,
        sectionId: ids.sectionId,
        courseId: ids.courseId,
        semester: ids.semester,
        ...(ids.facultyId ? { facultyId: ids.facultyId } : {}),
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
