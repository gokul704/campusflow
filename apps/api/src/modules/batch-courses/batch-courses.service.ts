import { prisma } from "@campusflow/db";

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
