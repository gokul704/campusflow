import { prisma } from "@campusflow/db";

export async function attendanceReport(tenantId: string, batchCourseId: string) {
  const batchCourse = await prisma.batchCourse.findFirst({
    where: { id: batchCourseId, tenantId },
    select: { id: true, batchId: true },
  });
  if (!batchCourse) throw new Error("BatchCourse not found");

  const students = await prisma.student.findMany({
    where: { tenantId, batchId: batchCourse.batchId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { rollNumber: "asc" },
  });

  const attendances = await prisma.attendance.findMany({
    where: { tenantId, batchCourseId },
  });

  const attendanceMap = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();

  for (const a of attendances) {
    if (!attendanceMap.has(a.studentId)) {
      attendanceMap.set(a.studentId, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    }
    const entry = attendanceMap.get(a.studentId)!;
    entry.total += 1;
    if (a.status === "PRESENT") entry.present += 1;
    else if (a.status === "ABSENT") entry.absent += 1;
    else if (a.status === "LATE") entry.late += 1;
    else if (a.status === "EXCUSED") entry.excused += 1;
  }

  return students.map((student: { id: string; rollNumber: string; user: { firstName: string; lastName: string } }) => {
    const stats = attendanceMap.get(student.id) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      ...stats,
      percentage: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
    };
  });
}

export async function attendanceCourseWiseReport(tenantId: string) {
  const rows = await prisma.attendance.findMany({
    where: { tenantId },
    include: {
      batchCourse: {
        select: {
          id: true,
          semester: true,
          batch: { select: { name: true } },
          course: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  const map = new Map<
    string,
    {
      batchCourseId: string;
      batchName: string;
      courseName: string;
      courseCode: string;
      semester: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      studentIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = row.batchCourseId;
    if (!map.has(key)) {
      map.set(key, {
        batchCourseId: row.batchCourseId,
        batchName: row.batchCourse.batch.name,
        courseName: row.batchCourse.course.name,
        courseCode: row.batchCourse.course.code,
        semester: row.batchCourse.semester,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        studentIds: new Set<string>(),
      });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    entry.studentIds.add(row.studentId);
    if (row.status === "PRESENT") entry.present += 1;
    else if (row.status === "ABSENT") entry.absent += 1;
    else if (row.status === "LATE") entry.late += 1;
    else if (row.status === "EXCUSED") entry.excused += 1;
  }

  return Array.from(map.values())
    .map((entry) => ({
      batchCourseId: entry.batchCourseId,
      batchName: entry.batchName,
      courseName: entry.courseName,
      courseCode: entry.courseCode,
      semester: entry.semester,
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      excused: entry.excused,
      total: entry.total,
      studentsMarked: entry.studentIds.size,
      percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.batchName !== b.batchName) return a.batchName.localeCompare(b.batchName);
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.courseName.localeCompare(b.courseName);
    });
}

export async function attendanceStudentWiseReport(tenantId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!student) throw new Error("Student not found");

  const rows = await prisma.attendance.findMany({
    where: { tenantId, studentId },
    include: {
      batchCourse: {
        select: {
          id: true,
          semester: true,
          batch: { select: { name: true } },
          course: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  const map = new Map<
    string,
    {
      batchCourseId: string;
      batchName: string;
      courseName: string;
      courseCode: string;
      semester: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
    }
  >();

  for (const row of rows) {
    const key = row.batchCourseId;
    if (!map.has(key)) {
      map.set(key, {
        batchCourseId: row.batchCourseId,
        batchName: row.batchCourse.batch.name,
        courseName: row.batchCourse.course.name,
        courseCode: row.batchCourse.course.code,
        semester: row.batchCourse.semester,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    if (row.status === "PRESENT") entry.present += 1;
    else if (row.status === "ABSENT") entry.absent += 1;
    else if (row.status === "LATE") entry.late += 1;
    else if (row.status === "EXCUSED") entry.excused += 1;
  }

  return {
    student: {
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      rollNumber: student.rollNumber,
    },
    courses: Array.from(map.values())
      .map((entry) => ({
        ...entry,
        percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (a.batchName !== b.batchName) return a.batchName.localeCompare(b.batchName);
        if (a.semester !== b.semester) return a.semester - b.semester;
        return a.courseName.localeCompare(b.courseName);
      }),
  };
}

export async function attendanceBatchWiseReport(tenantId: string) {
  const rows = await prisma.attendance.findMany({
    where: { tenantId },
    include: {
      batchCourse: {
        select: {
          batchId: true,
          batch: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  const map = new Map<
    string,
    {
      batchId: string;
      batchName: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      studentIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = row.batchCourse.batchId;
    if (!map.has(key)) {
      map.set(key, {
        batchId: row.batchCourse.batchId,
        batchName: row.batchCourse.batch.name,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        studentIds: new Set<string>(),
      });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    entry.studentIds.add(row.studentId);
    if (row.status === "PRESENT") entry.present += 1;
    else if (row.status === "ABSENT") entry.absent += 1;
    else if (row.status === "LATE") entry.late += 1;
    else if (row.status === "EXCUSED") entry.excused += 1;
  }

  return Array.from(map.values())
    .map((entry) => ({
      batchId: entry.batchId,
      batchName: entry.batchName,
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      excused: entry.excused,
      total: entry.total,
      studentsMarked: entry.studentIds.size,
      percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
    }))
    .sort((a, b) => a.batchName.localeCompare(b.batchName));
}

export async function attendanceSemesterWiseReport(tenantId: string) {
  const rows = await prisma.attendance.findMany({
    where: { tenantId },
    include: {
      batchCourse: {
        select: {
          semester: true,
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  const map = new Map<
    number,
    {
      semester: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      studentIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = row.batchCourse.semester;
    if (!map.has(key)) {
      map.set(key, {
        semester: key,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        studentIds: new Set<string>(),
      });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    entry.studentIds.add(row.studentId);
    if (row.status === "PRESENT") entry.present += 1;
    else if (row.status === "ABSENT") entry.absent += 1;
    else if (row.status === "LATE") entry.late += 1;
    else if (row.status === "EXCUSED") entry.excused += 1;
  }

  return Array.from(map.values())
    .map((entry) => ({
      semester: entry.semester,
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      excused: entry.excused,
      total: entry.total,
      studentsMarked: entry.studentIds.size,
      percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
    }))
    .sort((a, b) => a.semester - b.semester);
}

export async function gradeReport(tenantId: string, batchCourseId: string) {
  const batchCourse = await prisma.batchCourse.findFirst({
    where: { id: batchCourseId, tenantId },
  });
  if (!batchCourse) throw new Error("BatchCourse not found");

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, batchCourseId },
    include: {
      submissions: {
        include: {
          assignment: false,
        },
      },
    },
  });

  const examGrades = await prisma.examGrade.findMany({
    where: { tenantId, batchCourseId },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return { assignments, examGrades };
}

export async function feeReport(tenantId: string) {
  const totalStudents = await prisma.student.count({ where: { tenantId } });
  const totalStructures = await prisma.feeStructure.count({ where: { tenantId } });

  const paidPayments = await prisma.feePayment.aggregate({
    where: { tenantId, status: "PAID" },
    _sum: { amount: true },
    _count: { id: true },
  });

  const pendingCount = await prisma.feePayment.count({ where: { tenantId, status: "PENDING" } });
  const failedCount = await prisma.feePayment.count({ where: { tenantId, status: "FAILED" } });
  const refundedCount = await prisma.feePayment.count({ where: { tenantId, status: "REFUNDED" } });

  const structures = await prisma.feeStructure.findMany({
    where: { tenantId },
    include: {
      _count: { select: { payments: true } },
      payments: {
        where: { status: "PAID" },
        select: { amount: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const structureSummary = structures.map((s: { id: string; name: string; amount: number; dueDate: Date | null; _count: { payments: number }; payments: { amount: number }[] }) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    dueDate: s.dueDate,
    totalPayments: s._count.payments,
    paidCount: s.payments.length,
    paidAmount: s.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
  }));

  return {
    totalStudents,
    totalStructures,
    totalPaidAmount: paidPayments._sum.amount ?? 0,
    paidPaymentsCount: paidPayments._count.id,
    pendingCount,
    failedCount,
    refundedCount,
    structures: structureSummary,
  };
}

// ─── CSV / expanded exports ─────────────────────────────────────────────────

function csvRow(cells: unknown[]): string {
  return cells.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

export async function exportFeesPaymentsCsv(tenantId: string): Promise<string> {
  const rows = await prisma.feePayment.findMany({
    where: { tenantId },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      applicantUser: { select: { firstName: true, lastName: true, email: true } },
      feeStructure: { select: { name: true, dueDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const header = [
    "paymentId",
    "status",
    "amount",
    "feeName",
    "dueDate",
    "payerType",
    "rollNumber",
    "name",
    "email",
    "paidAt",
  ];
  const lines = [csvRow(header)];
  for (const r of rows) {
    const st = r.student;
    const ap = r.applicantUser;
    const name = st ? `${st.user.firstName} ${st.user.lastName}` : ap ? `${ap.firstName} ${ap.lastName}` : "";
    const email = st?.user.email ?? ap?.email ?? "";
    const roll = st?.rollNumber ?? "";
    lines.push(
      csvRow([
        r.id,
        r.status,
        r.amount,
        r.feeStructure.name,
        r.feeStructure.dueDate.toISOString(),
        st ? "student" : "applicant",
        roll,
        name,
        email,
        r.paidAt?.toISOString() ?? "",
      ])
    );
  }
  return lines.join("\n");
}

export async function exportAttendanceSummaryCsv(tenantId: string): Promise<string> {
  const students = await prisma.student.findMany({
    where: { tenantId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      attendances: { select: { status: true } },
    },
    orderBy: { rollNumber: "asc" },
  });
  const header = ["rollNumber", "name", "present", "late", "absent", "excused", "totalSessions", "pct"];
  const lines = [csvRow(header)];
  for (const s of students) {
    let p = 0,
      l = 0,
      a = 0,
      e = 0;
    for (const x of s.attendances) {
      if (x.status === "PRESENT") p++;
      else if (x.status === "LATE") l++;
      else if (x.status === "ABSENT") a++;
      else if (x.status === "EXCUSED") e++;
    }
    const tot = s.attendances.length;
    const pct = tot > 0 ? Math.round(((p + l) / tot) * 1000) / 10 : 0;
    lines.push(
      csvRow([s.rollNumber, `${s.user.firstName} ${s.user.lastName}`, p, l, a, e, tot, `${pct}%`])
    );
  }
  return lines.join("\n");
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function intervalsOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

export async function exportTimetableCsv(tenantId: string, batchCourseId?: string): Promise<string> {
  const rows = await prisma.timetable.findMany({
    where: { tenantId, ...(batchCourseId ? { batchCourseId } : {}) },
    include: {
      batchCourse: {
        include: {
          course: { select: { name: true, code: true } },
          batch: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  const header = ["dayOfWeek", "start", "end", "room", "batch", "section", "course", "code"];
  const lines = [csvRow(header)];
  for (const r of rows) {
    lines.push(
      csvRow([
        r.dayOfWeek,
        r.startTime,
        r.endTime,
        r.room ?? "",
        r.batchCourse.batch.name,
        r.batchCourse.section.name,
        r.batchCourse.course.name,
        r.batchCourse.course.code,
      ])
    );
  }
  return lines.join("\n");
}

export async function timetableConflictsJson(tenantId: string) {
  const rows = await prisma.timetable.findMany({
    where: { tenantId },
    include: {
      batchCourse: {
        include: {
          course: { select: { name: true, code: true } },
          batch: { select: { name: true } },
          faculty: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  const conflicts: { kind: "room" | "faculty"; message: string }[] = [];
  const days = [0, 1, 2, 3, 4, 5];
  for (const d of days) {
    const slice = rows.filter((r) => r.dayOfWeek === d);
    for (let i = 0; i < slice.length; i++) {
      for (let j = i + 1; j < slice.length; j++) {
        const a = slice[i]!;
        const b = slice[j]!;
        const a1 = parseTimeToMinutes(a.startTime);
        const a2 = parseTimeToMinutes(a.endTime);
        const b1 = parseTimeToMinutes(b.startTime);
        const b2 = parseTimeToMinutes(b.endTime);
        if (!intervalsOverlap(a1, a2, b1, b2)) continue;
        const room = a.room && b.room && a.room === b.room;
        if (room) {
          conflicts.push({
            kind: "room",
            message: `Room ${a.room} — overlap ${a.startTime}-${a.endTime} (${a.batchCourse.course.code}) vs ${b.startTime}-${b.endTime} (${b.batchCourse.course.code})`,
          });
        }
        const fa = a.batchCourse.facultyId;
        const fb = b.batchCourse.facultyId;
        if (fa && fb && fa === fb) {
          const fn = a.batchCourse.faculty?.user;
          const name = fn ? `${fn.firstName} ${fn.lastName}` : "Faculty";
          conflicts.push({
            kind: "faculty",
            message: `${name} double-booked: ${a.batchCourse.course.code} vs ${b.batchCourse.course.code} (${a.startTime}-${a.endTime} / ${b.startTime}-${b.endTime})`,
          });
        }
      }
    }
  }
  return { conflicts };
}

export async function exportAssignmentsCsv(tenantId: string, batchCourseId: string): Promise<string> {
  const bc = await prisma.batchCourse.findFirst({ where: { id: batchCourseId, tenantId } });
  if (!bc) throw new Error("BatchCourse not found");

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, batchCourseId },
    include: { submissions: true },
    orderBy: { dueDate: "asc" },
  });

  const header = ["assignmentTitle", "dueDate", "maxMarks", "submissions", "graded", "avgMarks"];
  const lines = [csvRow(header)];
  for (const a of assignments) {
    const subs = a.submissions;
    const graded = subs.filter((s) => s.marks != null).length;
    const sum = subs.reduce((acc, s) => acc + (s.marks ?? 0), 0);
    const avg = graded > 0 ? Math.round((sum / graded) * 100) / 100 : "";
    lines.push(
      csvRow([
        a.title,
        a.dueDate.toISOString(),
        a.maxMarks,
        subs.length,
        graded,
        avg === "" ? "" : String(avg),
      ])
    );
  }
  return lines.join("\n");
}

export async function exportExamsCsv(tenantId: string, batchCourseId: string): Promise<string> {
  const bc = await prisma.batchCourse.findFirst({ where: { id: batchCourseId, tenantId } });
  if (!bc) throw new Error("BatchCourse not found");

  const grades = await prisma.examGrade.findMany({
    where: { tenantId, batchCourseId },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = ["rollNumber", "studentName", "examType", "marks", "maxMarks", "percentage"];
  const lines = [csvRow(header)];
  for (const g of grades) {
    const pct = g.maxMarks > 0 ? Math.round((g.marks / g.maxMarks) * 1000) / 10 : 0;
    lines.push(
      csvRow([
        g.student.rollNumber,
        `${g.student.user.firstName} ${g.student.user.lastName}`,
        g.examType,
        g.marks,
        g.maxMarks,
        `${pct}%`,
      ])
    );
  }
  return lines.join("\n");
}

export async function exportGeneralCsv(tenantId: string): Promise<string> {
  const [students, faculty, courses, batches, paymentsPending] = await Promise.all([
    prisma.student.count({ where: { tenantId } }),
    prisma.faculty.count({ where: { tenantId } }),
    prisma.course.count({ where: { tenantId } }),
    prisma.batch.count({ where: { tenantId } }),
    prisma.feePayment.count({ where: { tenantId, status: "PENDING" } }),
  ]);
  const lines = [
    csvRow(["metric", "value"]),
    csvRow(["students", students]),
    csvRow(["faculty", faculty]),
    csvRow(["courses", courses]),
    csvRow(["batches", batches]),
    csvRow(["pendingFeePayments", paymentsPending]),
  ];
  return lines.join("\n");
}
