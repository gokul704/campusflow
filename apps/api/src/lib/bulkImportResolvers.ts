import { prisma } from "@campusflow/db";

export type BatchSectionInput = {
  batchId?: string | null;
  sectionId?: string | null;
  batchName?: string | null;
  sectionName?: string | null;
};

/** Resolve batch/section either by IDs or by display names (case-insensitive). */
export async function resolveBatchAndSectionIds(
  tenantId: string,
  opts: BatchSectionInput
): Promise<{ batchId: string; sectionId: string }> {
  const bid = opts.batchId?.trim();
  const sid = opts.sectionId?.trim();
  const bn = opts.batchName?.trim();
  const sn = opts.sectionName?.trim();

  if (bid && sid) {
    const section = await prisma.section.findFirst({
      where: { id: sid, tenantId, batchId: bid },
    });
    if (!section) throw new Error("Section not found for this batch (check batch ID and section ID).");
    return { batchId: bid, sectionId: sid };
  }

  if (bn && sn) {
    const batches = await prisma.batch.findMany({
      where: { tenantId, name: { equals: bn, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (batches.length === 0) throw new Error(`Batch not found: "${bn}"`);
    if (batches.length > 1) {
      throw new Error(
        `Multiple batches match "${bn}". Rename them to be unique in this institute, or use batch ID + section ID.`
      );
    }
    const batch = batches[0]!;
    const sections = await prisma.section.findMany({
      where: {
        tenantId,
        batchId: batch.id,
        name: { equals: sn, mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    if (sections.length === 0) {
      throw new Error(`Section "${sn}" not found in batch "${bn}".`);
    }
    if (sections.length > 1) {
      throw new Error(
        `Multiple sections named "${sn}" in batch "${bn}". Rename sections to be unique within the batch, or use IDs.`
      );
    }
    return { batchId: batch.id, sectionId: sections[0]!.id };
  }

  throw new Error("Provide batchName and sectionName, or batchId and sectionId.");
}

export type DepartmentLookupInput = {
  departmentId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
};

export async function resolveDepartmentId(
  tenantId: string,
  opts: DepartmentLookupInput,
  required: boolean
): Promise<string | undefined> {
  if (opts.departmentId?.trim()) {
    const d = await prisma.department.findFirst({ where: { id: opts.departmentId.trim(), tenantId } });
    if (!d) throw new Error("Department not found");
    return d.id;
  }
  if (opts.departmentCode?.trim()) {
    const d = await prisma.department.findUnique({
      where: { tenantId_code: { tenantId, code: opts.departmentCode.trim().toUpperCase() } },
    });
    if (!d) throw new Error(`Department code not found: ${opts.departmentCode}`);
    return d.id;
  }
  if (opts.departmentName?.trim()) {
    const rows = await prisma.department.findMany({
      where: { tenantId, name: { equals: opts.departmentName.trim(), mode: "insensitive" } },
    });
    if (rows.length === 0) throw new Error(`Department not found: ${opts.departmentName}`);
    if (rows.length > 1) throw new Error(`Multiple departments named "${opts.departmentName}" — use department code.`);
    return rows[0]!.id;
  }
  if (required) throw new Error("Department is required (departmentCode, departmentName, or departmentId).");
  return undefined;
}

/** IDs for creating a BatchCourse row (by batchCourseId, or by names + course + semester). */
export async function resolveBatchCourseCreateIds(
  tenantId: string,
  row: {
    batchCourseId?: string | null;
    batchId?: string | null;
    sectionId?: string | null;
    batchName?: string | null;
    sectionName?: string | null;
    courseCode?: string | null;
    courseId?: string | null;
    semester?: number | null;
    facultyId?: string | null;
    facultyEmail?: string | null;
  }
): Promise<{ batchId: string; sectionId: string; courseId: string; semester: number; facultyId?: string }> {
  if (row.batchCourseId?.trim()) {
    const bc = await prisma.batchCourse.findFirst({
      where: { id: row.batchCourseId.trim(), tenantId },
      select: { batchId: true, sectionId: true, courseId: true, semester: true, facultyId: true },
    });
    if (!bc) throw new Error("Batch course not found");
    return {
      batchId: bc.batchId,
      sectionId: bc.sectionId,
      courseId: bc.courseId,
      semester: bc.semester,
      facultyId: bc.facultyId ?? undefined,
    };
  }

  const sem = row.semester;
  if (sem == null || Number.isNaN(Number(sem))) throw new Error("semester is required (number).");

  const { batchId, sectionId } = await resolveBatchAndSectionIds(tenantId, {
    batchId: row.batchId,
    sectionId: row.sectionId,
    batchName: row.batchName,
    sectionName: row.sectionName,
  });

  let courseId = row.courseId?.trim();
  if (!courseId) {
    const code = row.courseCode?.trim().toUpperCase();
    if (!code) throw new Error("courseCode or courseId is required");
    const course = await prisma.course.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (!course) throw new Error(`Course code not found: ${code}`);
    courseId = course.id;
  } else {
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new Error("Course not found");
  }

  let facultyId = row.facultyId?.trim() || undefined;
  if (!facultyId && row.facultyEmail?.trim()) {
    const u = await prisma.user.findFirst({
      where: { tenantId, email: row.facultyEmail.trim().toLowerCase() },
      include: { faculty: true },
    });
    if (!u?.faculty) throw new Error(`No faculty profile for email: ${row.facultyEmail}`);
    facultyId = u.faculty.id;
  }

  return { batchId, sectionId, courseId, semester: Number(sem), facultyId };
}

/** Resolve BatchCourse id for timetable / attendance context. */
export async function resolveBatchCourseId(
  tenantId: string,
  row: Parameters<typeof resolveBatchCourseCreateIds>[1]
): Promise<string> {
  if (row.batchCourseId?.trim()) {
    const bc = await prisma.batchCourse.findFirst({ where: { id: row.batchCourseId.trim(), tenantId } });
    if (!bc) throw new Error("Batch course not found");
    return bc.id;
  }
  const ids = await resolveBatchCourseCreateIds(tenantId, row);
  const bc = await prisma.batchCourse.findFirst({
    where: {
      tenantId,
      batchId: ids.batchId,
      sectionId: ids.sectionId,
      courseId: ids.courseId,
      semester: ids.semester,
    },
    select: { id: true },
  });
  if (!bc) {
    throw new Error(
      "No batch course row matches batch/section/course/semester. Create it under Batch courses first, or use Batch Course ID."
    );
  }
  return bc.id;
}
