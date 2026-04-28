import { prisma, Role } from "@campusflow/db";
import { hashPassword } from "../auth/auth.service";
import * as timetableSvc from "../timetable/timetable.service";

export async function listStudents(tenantId: string, batchId?: string, sectionId?: string, search?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { tenantId };
  if (batchId) where.batchId = batchId;
  if (sectionId) where.sectionId = sectionId;
  if (search) {
    where.OR = [
      { rollNumber: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            dateOfBirth: true,
            portalAccessRestricted: true,
          },
        },
        batch: { select: { name: true } },
      },
      orderBy: { rollNumber: "asc" },
    }),
    prisma.student.count({ where }),
  ]);

  let accountsWithoutProfile: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    isActive: boolean;
    portalAccessRestricted: boolean;
  }> = [];

  if (!batchId?.trim() && !sectionId?.trim() && page === 1) {
    const userWhere: {
      tenantId: string;
      role: { in: Role[] };
      student: null;
      OR?: Array<Record<string, unknown>>;
    } = {
      tenantId,
      role: { in: [Role.STUDENT, Role.GUEST_STUDENT] },
      student: null,
    };
    if (search?.trim()) {
      const q = search.trim();
      userWhere.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const pendingUsers = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        portalAccessRestricted: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 150,
    });
    accountsWithoutProfile = pendingUsers.map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      portalAccessRestricted: u.portalAccessRestricted,
    }));
  }

  return {
    students,
    accountsWithoutProfile,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/** Students whose portal is effectively blocked (manual or overdue fees; active fee override excluded). */
export async function listRestrictedPortalStudents(tenantId: string) {
  const now = new Date();
  const students = await prisma.student.findMany({
    where: {
      tenantId,
      OR: [
        { user: { portalAccessRestricted: true } },
        {
          feePayments: {
            some: { status: "PENDING", feeStructure: { dueDate: { lt: now } } },
          },
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          portalAccessRestricted: true,
          portalRestrictionReason: true,
          feeAccessOverrideUntil: true,
        },
      },
      batch: { select: { name: true } },
      feePayments: {
        where: { status: "PENDING", feeStructure: { dueDate: { lt: now } } },
        select: { id: true },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  return students
    .map((s) => {
      const overrideActive = s.user.feeAccessOverrideUntil != null && s.user.feeAccessOverrideUntil > now;
      const feeLocked = s.feePayments.length > 0;
      const manual = s.user.portalAccessRestricted;
      const effective = !overrideActive && (manual || feeLocked);
      let reason: string | null = null;
      if (effective) {
        if (manual && s.user.portalRestrictionReason) reason = s.user.portalRestrictionReason;
        else if (manual) reason = "Portal suspended by institute";
        else if (feeLocked) reason = "Overdue fee instalments";
      }
      return {
        studentId: s.id,
        rollNumber: s.rollNumber,
        batchName: s.batch.name,
        user: s.user,
        feeLocked,
        manualRestricted: manual,
        effectiveRestricted: effective,
        reason,
      };
    })
    .filter((r) => r.effectiveRestricted);
}

export async function getStudent(tenantId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, tenantId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          isActive: true,
          portalAccessRestricted: true,
          portalRestrictionReason: true,
        },
      },
      batch: { select: { id: true, name: true } },
    },
  });
  if (!student) throw new Error("Student not found");

  let scheduleToday: { dayName: string; slots: unknown[] } = { dayName: "Today", slots: [] };
  try {
    scheduleToday = await timetableSvc.listTodaysSlotsForStudent(tenantId, id);
  } catch {
    // Student details should still open even if timetable data cannot be resolved.
  }
  return { ...student, scheduleToday };
}

async function assertAdmissionFeePaid(tenantId: string, userId: string) {
  const admissionStructures = await prisma.feeStructure.count({
    where: { tenantId, isAdmissionFee: true },
  });

  if (admissionStructures > 0) {
    const ok = await prisma.feePayment.findFirst({
      where: {
        tenantId,
        status: "PAID",
        applicantUserId: userId,
        feeStructure: { isAdmissionFee: true },
      },
    });
    if (!ok) {
      throw new Error("Paid admission fee is required before creating the student profile.");
    }
    return;
  }

  const anyPaidApplicant = await prisma.feePayment.findFirst({
    where: { tenantId, status: "PAID", applicantUserId: userId },
  });
  if (!anyPaidApplicant) {
    throw new Error(
      "At least one paid applicant fee payment must be recorded for this user before creating the student profile."
    );
  }
}

function parseOptionalDateOnly(iso?: string | null): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${iso}`);
  return d;
}

type StudentBatchInput = {
  batchId?: string | null;
  batchName?: string | null;
};

/** Creates a student User + Student profile in one step (no invite, no applicant-fee gate). */
export async function createStudentWithUser(
  tenantId: string,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    role?: "STUDENT" | "GUEST_STUDENT";
    password?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    rollNumber: string;
    parentName?: string | null;
    parentPhone?: string | null;
    address?: string | null;
  } & StudentBatchInput
) {
  const targetRole = input.role === Role.GUEST_STUDENT ? Role.GUEST_STUDENT : Role.STUDENT;
  const email = input.email.trim().toLowerCase();
  const rollExists = await prisma.student.findUnique({
    where: { tenantId_rollNumber: { tenantId, rollNumber: input.rollNumber.trim() } },
  });
  if (rollExists) throw new Error("Roll number already taken");

  const existingUser = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
    include: { student: { select: { id: true } } },
  });

  const resolveBatchId = async (): Promise<string> => {
    const byId = input.batchId?.trim();
    if (byId) {
      const batch = await prisma.batch.findFirst({ where: { id: byId, tenantId }, select: { id: true } });
      if (!batch) throw new Error("Batch not found");
      return batch.id;
    }
    const byName = input.batchName?.trim();
    if (!byName) throw new Error("Provide batchName or batchId.");
    const rows = await prisma.batch.findMany({
      where: { tenantId, name: { equals: byName, mode: "insensitive" } },
      select: { id: true },
    });
    if (rows.length === 0) throw new Error(`Batch not found: "${byName}"`);
    if (rows.length > 1) throw new Error(`Multiple batches match "${byName}". Use Batch ID.`);
    return rows[0]!.id;
  };

  const batchId = await resolveBatchId();

  if (!existingUser) {
    throw new Error("User account not found. Create the user in Users first, then complete the student profile.");
  }

  if (existingUser.student) {
    throw new Error(
      "This email already has a student profile. Open that student from the list or use a different email."
    );
  }
  if (existingUser.role !== Role.STUDENT && existingUser.role !== Role.GUEST_STUDENT) {
    throw new Error(
      "An account with this email already exists with another role. Use a different email or ask an administrator to adjust the account."
    );
  }

  const pwd = input.password?.trim();
  const passwordUpdate =
    pwd && pwd.length >= 8 ? { password: await hashPassword(pwd) } : {};

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        dateOfBirth: parseOptionalDateOnly(input.dateOfBirth) ?? null,
        role: targetRole,
        isActive: true,
        ...passwordUpdate,
      },
    });

    return tx.student.create({
      data: {
        userId: existingUser.id,
        tenantId,
        batchId,
        sectionId: null,
        rollNumber: input.rollNumber.trim(),
        parentName: input.parentName?.trim() || null,
        parentPhone: input.parentPhone?.trim() || null,
        address: input.address?.trim() || null,
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } }, batch: true },
    });
  });
}

export type BulkStudentRow = {
  email: string;
  firstName: string;
  lastName: string;
  password?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  batchId?: string | null;
  sectionId?: string | null;
  batchName?: string | null;
  sectionName?: string | null;
  rollNumber: string;
  parentName?: string | null;
  parentPhone?: string | null;
  address?: string | null;
};

export async function bulkCreateStudentsWithUsers(
  tenantId: string,
  rows: BulkStudentRow[],
  defaultPassword?: string | null
): Promise<{ created: number; failed: { index: number; email?: string; error: string }[] }> {
  const failed: { index: number; email?: string; error: string }[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      await createStudentWithUser(tenantId, {
        ...row,
        password: row.password?.trim() || defaultPassword?.trim() || null,
      });
      created++;
    } catch (e) {
      failed.push({
        index: i,
        email: row.email,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }
  return { created, failed };
}

/** Legacy: link an existing applicant user to a student profile (admission fee rules apply). */
export async function createStudentProfile(
  tenantId: string,
  userId: string,
  data: { batchId: string; sectionId: string; rollNumber: string; parentName?: string; parentPhone?: string; address?: string }
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "STUDENT" } });
  if (!user) throw new Error("User not found or not a student");

  const existing = await prisma.student.findUnique({ where: { userId } });
  if (existing) throw new Error("Student profile already exists");

  const rollExists = await prisma.student.findUnique({ where: { tenantId_rollNumber: { tenantId, rollNumber: data.rollNumber } } });
  if (rollExists) throw new Error("Roll number already taken");

  await assertAdmissionFeePaid(tenantId, userId);

  const created = await prisma.student.create({
    data: { userId, tenantId, ...data },
    include: { user: { select: { firstName: true, lastName: true, email: true } }, batch: true },
  });

  await prisma.feePayment.updateMany({
    where: { tenantId, applicantUserId: userId, studentId: null },
    data: { studentId: created.id, applicantUserId: null },
  });

  return created;
}

export async function updateStudentPortalAccess(
  tenantId: string,
  studentId: string,
  actorUserId: string,
  body: { action: "lift" | "restrict"; until?: string; reason?: string }
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    include: { user: { select: { id: true } } },
  });
  if (!student) throw new Error("Student not found");

  if (body.action === "restrict") {
    const msg = body.reason?.trim();
    if (!msg || msg.length < 5) {
      throw new Error("A restriction message is required (at least 5 characters) so the student can see why access was limited.");
    }
    return prisma.user.update({
      where: { id: student.userId },
      data: {
        portalAccessRestricted: true,
        portalRestrictionReason: msg,
        feeAccessOverrideUntil: null,
        feeAccessOverrideByUserId: null,
      },
      select: { id: true, portalAccessRestricted: true, portalRestrictionReason: true },
    });
  }

  // lift: without `until` = clear manual suspension only
  if (!body.until?.trim()) {
    return prisma.user.update({
      where: { id: student.userId },
      data: {
        portalAccessRestricted: false,
        portalRestrictionReason: null,
      },
      select: { id: true, portalAccessRestricted: true, portalRestrictionReason: true },
    });
  }

  const until = new Date(body.until);
  if (Number.isNaN(until.getTime()) || until <= new Date()) {
    throw new Error("until must be a future date");
  }
  const max = new Date();
  max.setDate(max.getDate() + 30);
  if (until > max) {
    throw new Error("Fee access override cannot exceed 30 days");
  }

  return prisma.user.update({
    where: { id: student.userId },
    data: {
      portalAccessRestricted: false,
      portalRestrictionReason: null,
      feeAccessOverrideUntil: until,
      feeAccessOverrideByUserId: actorUserId,
    },
    select: { id: true, feeAccessOverrideUntil: true },
  });
}

export async function updateStudentProfile(
  tenantId: string,
  id: string,
  data: { batchId?: string; parentName?: string; parentPhone?: string; address?: string }
) {
  const student = await prisma.student.findFirst({ where: { id, tenantId } });
  if (!student) throw new Error("Student not found");
  return prisma.student.update({ where: { id }, data });
}
