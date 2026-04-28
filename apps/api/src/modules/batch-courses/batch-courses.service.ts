import { prisma } from "@campusflow/db";

const batchCourseInclude = {
  batch: { select: { name: true } },
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
  filters: { batchId?: string; semester?: number; facultyId?: string }
) {
  return prisma.batchCourse.findMany({
    where: {
      tenantId,
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
      ...(filters.semester ? { semester: filters.semester } : {}),
      ...(filters.facultyId ? { facultyId: filters.facultyId } : {}),
    },
    include: batchCourseInclude,
    // Order by semester + id — avoids fragile nested relation sort across Prisma versions
    orderBy: [{ semester: "asc" }, { id: "asc" }],
  });
}

export async function createBatchCourse(
  tenantId: string,
  data: { batchId: string; sectionId?: string | null; courseId: string; semester: number; facultyId?: string }
) {
  try {
    return await prisma.batchCourse.create({
      data: { tenantId, ...data },
      include: batchCourseInclude,
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error("Already assigned — this course already exists for this batch and semester");
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
  const resolveBatchId = async (row: { batchId?: string | null; batchName?: string | null }) => {
    const batchId = row.batchId?.trim();
    if (batchId) {
      const batch = await prisma.batch.findFirst({ where: { id: batchId, tenantId }, select: { id: true } });
      if (!batch) throw new Error("Batch not found");
      return batch.id;
    }
    const batchName = row.batchName?.trim();
    if (!batchName) throw new Error("batchId or batchName is required");
    const batches = await prisma.batch.findMany({
      where: { tenantId, name: { equals: batchName, mode: "insensitive" } },
      select: { id: true },
    });
    if (batches.length === 0) throw new Error(`Batch not found: ${batchName}`);
    if (batches.length > 1) throw new Error(`Multiple batches named "${batchName}" — use Batch ID.`);
    return batches[0]!.id;
  };

  const resolveCourseId = async (row: { courseId?: string | null; courseCode?: string | null }) => {
    const courseId = row.courseId?.trim();
    if (courseId) {
      const course = await prisma.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true } });
      if (!course) throw new Error("Course not found");
      return course.id;
    }
    const code = row.courseCode?.trim().toUpperCase();
    if (!code) throw new Error("courseCode or courseId is required");
    const course = await prisma.course.findUnique({ where: { tenantId_code: { tenantId, code } }, select: { id: true } });
    if (!course) throw new Error(`Course code not found: ${code}`);
    return course.id;
  };

  const resolveFacultyId = async (row: { facultyId?: string | null; facultyEmail?: string | null }) => {
    const facultyId = row.facultyId?.trim();
    if (facultyId) return facultyId;
    const email = row.facultyEmail?.trim().toLowerCase();
    if (!email) return undefined;
    const u = await prisma.user.findFirst({
      where: { tenantId, email },
      include: { faculty: true },
    });
    if (!u?.faculty) throw new Error(`No faculty profile for email: ${row.facultyEmail}`);
    return u.faculty.id;
  };

  const failed: { index: number; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const batchId = await resolveBatchId(row);
      const courseId = await resolveCourseId(row);
      const facultyId = await resolveFacultyId(row);
      await createBatchCourse(tenantId, {
        batchId,
        sectionId: row.sectionId ?? null,
        courseId,
        semester: row.semester,
        ...(facultyId ? { facultyId } : {}),
      });
      created++;
    } catch (e) {
      failed.push({ index: i, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { created, failed };
}
