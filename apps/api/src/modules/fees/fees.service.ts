import { prisma, PaymentStatus } from "@campusflow/db";

export async function listFeeStructures(tenantId: string) {
  return prisma.feeStructure.findMany({
    where: { tenantId },
    include: { _count: { select: { payments: true } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function createFeeStructure(
  tenantId: string,
  data: { name: string; amount: number; dueDate: string; isRecurring?: boolean; isAdmissionFee?: boolean }
) {
  return prisma.feeStructure.create({
    data: {
      tenantId,
      name: data.name,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      isRecurring: data.isRecurring ?? false,
      isAdmissionFee: data.isAdmissionFee ?? false,
    },
  });
}

export async function updateFeeStructure(
  tenantId: string,
  id: string,
  data: { name?: string; amount?: number; dueDate?: string; isRecurring?: boolean; isAdmissionFee?: boolean }
) {
  const record = await prisma.feeStructure.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Fee structure not found");
  return prisma.feeStructure.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
}

export async function deleteFeeStructure(tenantId: string, id: string) {
  const record = await prisma.feeStructure.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Fee structure not found");

  const paidCount = await prisma.feePayment.count({
    where: { feeStructureId: id, status: "PAID" },
  });
  if (paidCount > 0) {
    throw new Error(`Cannot delete — ${paidCount} paid payments exist for this fee structure`);
  }

  return prisma.feeStructure.delete({ where: { id } });
}

export async function getFeePayments(
  tenantId: string,
  filters: { studentId?: string; feeStructureId?: string; status?: PaymentStatus },
  opts?: { restrictToStudentUserId?: string }
) {
  let studentScope: { studentId?: string; applicantUserId?: string } | undefined;
  if (opts?.restrictToStudentUserId) {
    const st = await prisma.student.findFirst({
      where: { tenantId, userId: opts.restrictToStudentUserId },
      select: { id: true },
    });
    studentScope = st
      ? { studentId: st.id }
      : { applicantUserId: opts.restrictToStudentUserId };
  }

  return prisma.feePayment.findMany({
    where: {
      tenantId,
      ...(studentScope ?? {}),
      ...(!studentScope && filters.studentId ? { studentId: filters.studentId } : {}),
      ...(filters.feeStructureId ? { feeStructureId: filters.feeStructureId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      applicantUser: { select: { firstName: true, lastName: true, email: true } },
      feeStructure: { select: { name: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFeePayment(
  tenantId: string,
  data: { feeStructureId: string; studentId?: string; applicantUserId?: string }
) {
  if (Boolean(data.studentId) === Boolean(data.applicantUserId)) {
    throw new Error("Provide exactly one of studentId or applicantUserId");
  }

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { id: data.feeStructureId, tenantId },
  });
  if (!feeStructure) throw new Error("Fee structure not found");

  if (data.studentId) {
    const st = await prisma.student.findFirst({ where: { id: data.studentId, tenantId } });
    if (!st) throw new Error("Student not found");
  } else if (data.applicantUserId) {
    const u = await prisma.user.findFirst({
      where: { id: data.applicantUserId, tenantId, role: "PRESENT_STUDENT" },
      include: { student: true },
    });
    if (!u) throw new Error("Applicant user not found");
    if (u.student) throw new Error("User already has a student profile — record payment against the student instead.");
  }

  return prisma.feePayment.create({
    data: {
      tenantId,
      studentId: data.studentId ?? null,
      applicantUserId: data.applicantUserId ?? null,
      feeStructureId: data.feeStructureId,
      amount: feeStructure.amount,
      status: "PENDING",
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      applicantUser: { select: { firstName: true, lastName: true, email: true } },
      feeStructure: { select: { name: true, amount: true } },
    },
  });
}

export async function updatePaymentStatus(
  tenantId: string,
  id: string,
  status: PaymentStatus,
  paidAt?: string
) {
  const record = await prisma.feePayment.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error("Fee payment not found");

  return prisma.feePayment.update({
    where: { id },
    data: {
      status,
      paidAt: paidAt ? new Date(paidAt) : (status === "PAID" ? new Date() : undefined),
    },
  });
}
