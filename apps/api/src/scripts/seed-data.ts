#!/usr/bin/env tsx
/**
 * Seed initial academic data for a tenant.
 *
 * Usage:
 *   npm run api:seed:data -- --slug=mish
 *   npm run api:seed:data   (uses SINGLE_TENANT_SLUG or the only tenant in DB)
 *
 * `npm run seed:data` runs `db:deploy` first so the database matches the Prisma schema
 * (e.g. `users.dateOfBirth`). Use NODE_ENV=production to skip verbose Prisma query logs.
 */

import { prisma, Role } from "@campusflow/db";
import bcrypt from "bcryptjs";
import {
  printStandaloneSlugHint,
  printTenantSlugResolutionFailure,
  resolveTenantSlugForSeed,
} from "./resolveTenantSlugForSeed";

function slugFromArgv(): string | undefined {
  return process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]?.trim();
}

async function main() {
  const slug = await resolveTenantSlugForSeed(slugFromArgv());
  if (!slug) {
    console.error(`
Usage (tenant must already exist — run npm run api:seed first):

  From repo root:
    npm run api:seed:data -- --slug=mish
    npm run api:seed:data   (with SINGLE_TENANT_SLUG in .env, or exactly one tenant in DB)

  Or from apps/api:
    npm run seed:data -- --slug=mish
`);
    printStandaloneSlugHint();
    await printTenantSlugResolutionFailure();
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Tenant "${slug}" not found.`);
    process.exit(1);
  }

  console.log(`\n🌱 Seeding data for: ${tenant.name}\n`);

  // ── 1. Departments ──────────────────────────────────────────
  const deptData = [
    { name: "Computer Science & Engineering", code: "CSE" },
    { name: "Electronics & Communication",    code: "ECE" },
    { name: "Mechanical Engineering",         code: "MECH" },
    { name: "Civil Engineering",              code: "CIVIL" },
  ];

  const departments: Record<string, string> = {};

  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: d.code } },
      create: { tenantId: tenant.id, ...d },
      update: {},
    });
    departments[d.code] = dept.id;
    console.log(`  ✅ Department: ${d.name} (${d.code})`);
  }

  // ── 2. Batches ───────────────────────────────────────────────
  const batchData = [
    { name: "2023-2026", startYear: 2023, endYear: 2026 },
    { name: "2024-2027", startYear: 2024, endYear: 2027 },
    { name: "2025-2028", startYear: 2025, endYear: 2028 },
  ];

  const batches: Record<string, string> = {};

  for (const b of batchData) {
    const existing = await prisma.batch.findFirst({
      where: { tenantId: tenant.id, name: b.name },
    });
    const batch = existing ?? await prisma.batch.create({
      data: { tenantId: tenant.id, ...b },
    });
    batches[b.name] = batch.id;
    console.log(`  ✅ Batch: ${b.name}`);
  }

  // ── 3. Sections ──────────────────────────────────────────────
  const sectionNames = ["A", "B", "C", "D"];
  const sections: Record<string, string> = {}; // "batchName_section" → id

  for (const [batchName, batchId] of Object.entries(batches)) {
    for (const sName of sectionNames) {
      const key = `${batchName}_${sName}`;
      const existing = await prisma.section.findUnique({
        where: { batchId_name: { batchId, name: sName } },
      });
      const section = existing ?? await prisma.section.create({
        data: { tenantId: tenant.id, batchId, name: sName },
      });
      sections[key] = section.id;
    }
    console.log(`  ✅ Sections for ${batchName}: A, B, C, D`);
  }

  // ── 4. Courses ───────────────────────────────────────────────
  const courseData = [
    // Common courses
    { code: "MATH101", name: "Engineering Mathematics I",    isCommon: true,  departmentId: null, credits: 4 },
    { code: "MATH102", name: "Engineering Mathematics II",   isCommon: true,  departmentId: null, credits: 4 },
    { code: "PHY101",  name: "Engineering Physics",          isCommon: true,  departmentId: null, credits: 3 },
    { code: "CHEM101", name: "Engineering Chemistry",        isCommon: true,  departmentId: null, credits: 3 },
    { code: "ENG101",  name: "Technical English",            isCommon: true,  departmentId: null, credits: 2 },
    // CSE
    { code: "CS101",   name: "Introduction to Programming",  isCommon: false, departmentId: "CSE", credits: 4 },
    { code: "CS102",   name: "Data Structures",              isCommon: false, departmentId: "CSE", credits: 4 },
    { code: "CS201",   name: "Object Oriented Programming",  isCommon: false, departmentId: "CSE", credits: 4 },
    { code: "CS202",   name: "Database Management Systems",  isCommon: false, departmentId: "CSE", credits: 4 },
    { code: "CS301",   name: "Operating Systems",            isCommon: false, departmentId: "CSE", credits: 4 },
    { code: "CS302",   name: "Computer Networks",            isCommon: false, departmentId: "CSE", credits: 4 },
    // ECE
    { code: "EC101",   name: "Basic Electronics",            isCommon: false, departmentId: "ECE", credits: 4 },
    { code: "EC102",   name: "Circuit Theory",               isCommon: false, departmentId: "ECE", credits: 4 },
    { code: "EC201",   name: "Digital Electronics",          isCommon: false, departmentId: "ECE", credits: 4 },
    { code: "EC202",   name: "Signals & Systems",            isCommon: false, departmentId: "ECE", credits: 4 },
    // MECH
    { code: "ME101",   name: "Engineering Mechanics",        isCommon: false, departmentId: "MECH", credits: 4 },
    { code: "ME102",   name: "Thermodynamics",               isCommon: false, departmentId: "MECH", credits: 4 },
  ];

  const courses: Record<string, string> = {};

  for (const c of courseData) {
    const deptId = c.departmentId ? departments[c.departmentId] : null;
    const course = await prisma.course.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: c.code } },
      create: {
        tenantId: tenant.id,
        code: c.code,
        name: c.name,
        isCommon: c.isCommon,
        credits: c.credits,
        ...(deptId ? { departmentId: deptId } : {}),
      },
      update: {},
    });
    courses[c.code] = course.id;
  }
  console.log(`  ✅ Courses: ${Object.keys(courses).length} created`);

  // ── 5. Faculty Users ──────────────────────────────────────
  const facultyData = [
    { email: "ramesh.cse@mish.edu",  firstName: "Ramesh",  lastName: "Kumar",   deptCode: "CSE",  designation: "Assistant Professor", qualification: "M.Tech",  phone: "+919876543201", dateOfBirth: new Date("1984-06-15") },
    { email: "priya.cse@mish.edu",   firstName: "Priya",   lastName: "Sharma",  deptCode: "CSE",  designation: "Associate Professor", qualification: "PhD",     phone: "+919876543202", dateOfBirth: new Date("1980-03-22") },
    { email: "suresh.ece@mish.edu",  firstName: "Suresh",  lastName: "Reddy",   deptCode: "ECE",  designation: "Assistant Professor", qualification: "M.Tech",  phone: "+919876543203", dateOfBirth: new Date("1987-11-08") },
    { email: "anitha.mech@mish.edu", firstName: "Anitha",  lastName: "Rao",     deptCode: "MECH", designation: "Professor",           qualification: "PhD",     phone: "+919876543204", dateOfBirth: new Date("1976-09-01") },
  ];

  const hashed = await bcrypt.hash("Faculty@123", 12);
  const facultyIds: Record<string, string> = {};

  for (const f of facultyData) {
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: f.email } },
    });
    const user = existing ?? await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: f.email,
        password: hashed,
        firstName: f.firstName,
        lastName: f.lastName,
        role: Role.ASSISTANT_PROFESSOR,
        phone: f.phone,
        dateOfBirth: f.dateOfBirth,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { firstName: f.firstName, lastName: f.lastName, phone: f.phone, dateOfBirth: f.dateOfBirth },
    });
    let profile = await prisma.faculty.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.faculty.create({
        data: { userId: user.id, tenantId: tenant.id, departmentId: departments[f.deptCode], designation: f.designation, qualification: f.qualification },
      });
    }
    facultyIds[f.email] = profile.id;
    console.log(`  ✅ Faculty: ${f.firstName} ${f.lastName} (${f.deptCode})`);
  }

  // ── 6. Student Users ──────────────────────────────────────
  // Students in CSE 2024-2027, split across sections A and B
  const batchForStudents = batches["2024-2027"];
  const sectionA = sections["2024-2027_A"];
  const sectionB = sections["2024-2027_B"];

  const studentData = [
    { email: "student1@mish.edu", firstName: "Arun",    lastName: "Patel",   rollNumber: "CSE24001", section: sectionA, phone: "+919811122301", dateOfBirth: new Date("2006-01-20") },
    { email: "student2@mish.edu", firstName: "Bhavana", lastName: "Reddy",   rollNumber: "CSE24002", section: sectionA, phone: "+919811122302", dateOfBirth: new Date("2006-04-12") },
    { email: "student3@mish.edu", firstName: "Charan",  lastName: "Kumar",   rollNumber: "CSE24003", section: sectionA, phone: "+919811122303", dateOfBirth: new Date("2005-12-05") },
    { email: "student4@mish.edu", firstName: "Divya",   lastName: "Singh",   rollNumber: "CSE24004", section: sectionB, phone: "+919811122304", dateOfBirth: new Date("2006-07-30") },
    { email: "student5@mish.edu", firstName: "Eshan",   lastName: "Mehta",   rollNumber: "CSE24005", section: sectionB, phone: "+919811122305", dateOfBirth: new Date("2006-02-18") },
  ];

  const studentHashed = await bcrypt.hash("Student@123", 12);
  const studentIds: string[] = [];
  const sectionAStudents: string[] = [];
  const sectionBStudents: string[] = [];

  for (const s of studentData) {
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: s.email } },
    });
    const user = existing ?? await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: s.email,
        password: studentHashed,
        firstName: s.firstName,
        lastName: s.lastName,
        role: Role.STUDENT,
        phone: s.phone,
        dateOfBirth: s.dateOfBirth,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { firstName: s.firstName, lastName: s.lastName, phone: s.phone, dateOfBirth: s.dateOfBirth },
    });
    let profile = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.student.create({
        data: { userId: user.id, tenantId: tenant.id, batchId: batchForStudents, sectionId: s.section, rollNumber: s.rollNumber },
      });
    } else if (!profile.sectionId) {
      // Update existing students missing sectionId
      profile = await prisma.student.update({
        where: { id: profile.id },
        data: { sectionId: s.section },
      });
    }
    studentIds.push(profile.id);
    if (s.section === sectionA) sectionAStudents.push(profile.id);
    else sectionBStudents.push(profile.id);
    console.log(`  ✅ Student: ${s.firstName} ${s.lastName} (${s.rollNumber}) → Section ${s.section === sectionA ? "A" : "B"}`);
  }

  // ── 7. Batch Courses (CSE 2024-2027) ───────────────────────
  // Section A — Sem 1: 4 courses, Sem 2: 3 courses
  // Section B — Sem 1: same 4 courses, different/same faculty
  const batchId = batchForStudents;
  const batchCourseIds: Record<string, string> = {};

  if (!batchId) {
    console.warn("  ⚠ Batch 2024-2027 not found, skipping batch courses");
  } else {
    // Section A assignments
    const sectionACourses = [
      { code: "MATH101", semester: 1, facultyEmail: "ramesh.cse@mish.edu" },
      { code: "PHY101",  semester: 1, facultyEmail: "ramesh.cse@mish.edu" },
      { code: "ENG101",  semester: 1, facultyEmail: "priya.cse@mish.edu" },
      { code: "CS101",   semester: 1, facultyEmail: "ramesh.cse@mish.edu" },
      { code: "MATH102", semester: 2, facultyEmail: "priya.cse@mish.edu" },
      { code: "CHEM101", semester: 2, facultyEmail: "priya.cse@mish.edu" },
      { code: "CS102",   semester: 2, facultyEmail: "ramesh.cse@mish.edu" },
    ];

    for (const { code, semester, facultyEmail } of sectionACourses) {
      const bc = await prisma.batchCourse.upsert({
        where: { sectionId_courseId_semester: { sectionId: sectionA, courseId: courses[code], semester } },
        create: { tenantId: tenant.id, batchId, sectionId: sectionA, courseId: courses[code], semester, facultyId: facultyIds[facultyEmail] },
        update: { facultyId: facultyIds[facultyEmail] },
      });
      batchCourseIds[`A_${code}_${semester}`] = bc.id;
    }

    // Section B assignments — same courses Sem 1, different faculty for some
    const sectionBCourses = [
      { code: "MATH101", semester: 1, facultyEmail: "priya.cse@mish.edu" },  // different faculty!
      { code: "PHY101",  semester: 1, facultyEmail: "ramesh.cse@mish.edu" },
      { code: "ENG101",  semester: 1, facultyEmail: "priya.cse@mish.edu" },
      { code: "CS101",   semester: 1, facultyEmail: "priya.cse@mish.edu" },  // different faculty!
    ];

    for (const { code, semester, facultyEmail } of sectionBCourses) {
      const bc = await prisma.batchCourse.upsert({
        where: { sectionId_courseId_semester: { sectionId: sectionB, courseId: courses[code], semester } },
        create: { tenantId: tenant.id, batchId, sectionId: sectionB, courseId: courses[code], semester, facultyId: facultyIds[facultyEmail] },
        update: { facultyId: facultyIds[facultyEmail] },
      });
      batchCourseIds[`B_${code}_${semester}`] = bc.id;
    }

    console.log(`  ✅ BatchCourses: Section A → Sem 1 (4) + Sem 2 (3), Section B → Sem 1 (4)`);
  }

  // ── 8. Timetable ────────────────────────────────────────────
  // Section A slots
  const cs101A = batchCourseIds["A_CS101_1"];
  const math101A = batchCourseIds["A_MATH101_1"];
  const phy101A = batchCourseIds["A_PHY101_1"];
  const eng101A = batchCourseIds["A_ENG101_1"];
  // Section B slots
  const cs101B = batchCourseIds["B_CS101_1"];
  const math101B = batchCourseIds["B_MATH101_1"];

  const timetableData = [
    // Section A
    { batchCourseId: math101A, dayOfWeek: 0, startTime: "09:00", endTime: "10:00", room: "Room 101" },
    { batchCourseId: cs101A,   dayOfWeek: 0, startTime: "10:00", endTime: "11:00", room: "Lab 1" },
    { batchCourseId: phy101A,  dayOfWeek: 1, startTime: "09:00", endTime: "10:00", room: "Room 102" },
    { batchCourseId: math101A, dayOfWeek: 2, startTime: "09:00", endTime: "10:00", room: "Room 101" },
    { batchCourseId: eng101A,  dayOfWeek: 3, startTime: "11:00", endTime: "12:00", room: "Room 103" },
    // Section B (different rooms/times)
    { batchCourseId: math101B, dayOfWeek: 0, startTime: "11:00", endTime: "12:00", room: "Room 201" },
    { batchCourseId: cs101B,   dayOfWeek: 0, startTime: "14:00", endTime: "15:00", room: "Lab 2" },
    { batchCourseId: cs101B,   dayOfWeek: 2, startTime: "14:00", endTime: "15:00", room: "Lab 2" },
  ];

  for (const t of timetableData) {
    if (!t.batchCourseId) continue;
    const exists = await prisma.timetable.findFirst({
      where: { tenantId: tenant.id, batchCourseId: t.batchCourseId, dayOfWeek: t.dayOfWeek, startTime: t.startTime },
    });
    if (!exists) {
      await prisma.timetable.create({ data: { tenantId: tenant.id, ...t } });
    }
  }
  console.log(`  ✅ Timetable: ${timetableData.length} slots (Section A + B)`);

  // ── 9. Attendance (Section A — CS101 last 5 days) ──────────
  if (cs101A && sectionAStudents.length > 0) {
    const attendanceDates = ["2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28"];
    let attCount = 0;

    for (const date of attendanceDates) {
      for (let i = 0; i < sectionAStudents.length; i++) {
        const status = (i === 1 && date === "2026-03-26") ? "LATE" :
                       (i === 2 && date === "2026-03-25") ? "ABSENT" : "PRESENT";
        await prisma.attendance.upsert({
          where: { studentId_batchCourseId_date: { studentId: sectionAStudents[i], batchCourseId: cs101A, date: new Date(date) } },
          create: { tenantId: tenant.id, studentId: sectionAStudents[i], batchCourseId: cs101A, date: new Date(date), status },
          update: {},
        });
        attCount++;
      }
    }

    // Math101 Section A
    if (math101A) {
      for (const date of ["2026-03-24", "2026-03-25", "2026-03-26"]) {
        for (const studentId of sectionAStudents) {
          await prisma.attendance.upsert({
            where: { studentId_batchCourseId_date: { studentId, batchCourseId: math101A, date: new Date(date) } },
            create: { tenantId: tenant.id, studentId, batchCourseId: math101A, date: new Date(date), status: "PRESENT" },
            update: {},
          });
          attCount++;
        }
      }
    }

    // Section B — CS101
    if (cs101B && sectionBStudents.length > 0) {
      for (const date of ["2026-03-24", "2026-03-25"]) {
        for (const studentId of sectionBStudents) {
          await prisma.attendance.upsert({
            where: { studentId_batchCourseId_date: { studentId, batchCourseId: cs101B, date: new Date(date) } },
            create: { tenantId: tenant.id, studentId, batchCourseId: cs101B, date: new Date(date), status: "PRESENT" },
            update: {},
          });
          attCount++;
        }
      }
    }

    console.log(`  ✅ Attendance: ${attCount} records (Section A + B)`);
  }

  // ── 10. Assignments ────────────────────────────────────────
  if (cs101A) {
    const assignment1 = await prisma.assignment.upsert({
      where: { id: "seed-asgn-cs101a-1" },
      create: {
        id: "seed-asgn-cs101a-1",
        tenantId: tenant.id,
        batchCourseId: cs101A,
        title: "Hello World Program",
        description: "Write a simple Hello World program in C language and explain the basic structure.",
        dueDate: new Date("2026-04-05"),
        maxMarks: 10,
      },
      update: {},
    });

    await prisma.assignment.upsert({
      where: { id: "seed-asgn-cs101a-2" },
      create: {
        id: "seed-asgn-cs101a-2",
        tenantId: tenant.id,
        batchCourseId: cs101A,
        title: "Variables and Data Types",
        description: "Write a program demonstrating all primitive data types with examples.",
        dueDate: new Date("2026-04-15"),
        maxMarks: 20,
      },
      update: {},
    });

    // Submissions for Section A students
    for (let i = 0; i < sectionAStudents.length && i < 2; i++) {
      await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment1.id, studentId: sectionAStudents[i] } },
        create: { tenantId: tenant.id, assignmentId: assignment1.id, studentId: sectionAStudents[i], remarks: i === 0 ? "Good work" : "Well structured", marks: 8 + i },
        update: {},
      });
    }

    console.log(`  ✅ Assignments: 2 assignments (Section A), 2 graded submissions`);
  }

  // Section B assignment
  if (cs101B) {
    await prisma.assignment.upsert({
      where: { id: "seed-asgn-cs101b-1" },
      create: {
        id: "seed-asgn-cs101b-1",
        tenantId: tenant.id,
        batchCourseId: cs101B,
        title: "Hello World Program",
        description: "Write a simple Hello World program in C and explain line by line.",
        dueDate: new Date("2026-04-07"),
        maxMarks: 10,
      },
      update: {},
    });
    console.log(`  ✅ Assignments: 1 assignment (Section B)`);
  }

  // ── 11. Exam Grades ────────────────────────────────────────
  if (cs101A && sectionAStudents.length > 0) {
    const examData = [
      { studentIdx: 0, examType: "MIDTERM", marks: 72, maxMarks: 100 },
      { studentIdx: 1, examType: "MIDTERM", marks: 85, maxMarks: 100 },
      { studentIdx: 2, examType: "MIDTERM", marks: 68, maxMarks: 100 },
      { studentIdx: 0, examType: "INTERNAL", marks: 18, maxMarks: 25 },
      { studentIdx: 1, examType: "INTERNAL", marks: 22, maxMarks: 25 },
    ];

    for (const e of examData) {
      await prisma.examGrade.upsert({
        where: { studentId_batchCourseId_examType: { studentId: sectionAStudents[e.studentIdx], batchCourseId: cs101A, examType: e.examType } },
        create: { tenantId: tenant.id, studentId: sectionAStudents[e.studentIdx], batchCourseId: cs101A, examType: e.examType, marks: e.marks, maxMarks: e.maxMarks },
        update: {},
      });
    }
    console.log(`  ✅ Exam Grades: ${examData.length} records (Section A)`);
  }

  // ── 12. Fee Structures ────────────────────────────────────────
  const feeStructures: Record<string, string> = {};
  const feeData = [
    { name: "Tuition Fee - Semester 1", amount: 45000, dueDate: new Date("2026-07-31"), isRecurring: false },
    { name: "Tuition Fee - Semester 2", amount: 45000, dueDate: new Date("2027-01-31"), isRecurring: false },
    { name: "Development Fee",          amount: 10000, dueDate: new Date("2026-07-31"), isRecurring: false },
    { name: "Library Fee",              amount: 2000,  dueDate: new Date("2026-07-31"), isRecurring: true },
    { name: "Lab Fee",                  amount: 5000,  dueDate: new Date("2026-07-31"), isRecurring: false },
  ];

  for (const f of feeData) {
    const existing = await prisma.feeStructure.findFirst({ where: { tenantId: tenant.id, name: f.name } });
    const fs = existing ?? await prisma.feeStructure.create({ data: { tenantId: tenant.id, ...f } });
    feeStructures[f.name] = fs.id;
  }
  console.log(`  ✅ Fee Structures: ${feeData.length} created`);

  // ── 13. Fee Payments (sample) ─────────────────────────────────
  const tuitionFeeId = feeStructures["Tuition Fee - Semester 1"];
  const devFeeId     = feeStructures["Development Fee"];

  if (tuitionFeeId && studentIds.length > 0) {
    const paymentData = [
      { studentId: studentIds[0], feeStructureId: tuitionFeeId, amount: 45000, status: "PAID" as const,    paidAt: new Date("2026-07-20") },
      { studentId: studentIds[1], feeStructureId: tuitionFeeId, amount: 45000, status: "PAID" as const,    paidAt: new Date("2026-07-22") },
      { studentId: studentIds[2], feeStructureId: tuitionFeeId, amount: 45000, status: "PENDING" as const, paidAt: null },
      { studentId: studentIds[3], feeStructureId: tuitionFeeId, amount: 45000, status: "PENDING" as const, paidAt: null },
      { studentId: studentIds[0], feeStructureId: devFeeId,     amount: 10000, status: "PAID" as const,    paidAt: new Date("2026-07-20") },
    ];

    for (const p of paymentData) {
      const exists = await prisma.feePayment.findFirst({
        where: { tenantId: tenant.id, studentId: p.studentId, feeStructureId: p.feeStructureId },
      });
      if (!exists) {
        await prisma.feePayment.create({ data: { tenantId: tenant.id, ...p } });
      }
    }
    console.log(`  ✅ Fee Payments: ${paymentData.length} records`);
  }

  // ── 14. Events ────────────────────────────────────────────────
  const eventData = [
    { title: "Semester 1 Examination",    description: "End semester examinations for all Semester 1 students", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-15"), eventType: "EXAM" as const },
    { title: "Annual Tech Workshop",      description: "Two-day hands-on workshop on emerging technologies",    startDate: new Date("2026-04-10"), endDate: new Date("2026-04-11"), eventType: "WORKSHOP" as const },
    { title: "Independence Day Holiday",  description: "National holiday",                                      startDate: new Date("2026-08-15"), endDate: null,                  eventType: "HOLIDAY" as const },
    { title: "Mid-term Examination",      description: "Mid-term examinations for all courses",                 startDate: new Date("2026-03-20"), endDate: new Date("2026-03-22"), eventType: "EXAM" as const },
    { title: "Annual Sports Day",         description: "Annual inter-department sports competition",             startDate: new Date("2026-04-25"), endDate: null,                  eventType: "EVENT" as const },
  ];

  for (const e of eventData) {
    const exists = await prisma.event.findFirst({ where: { tenantId: tenant.id, title: e.title } });
    if (!exists) {
      await prisma.event.create({ data: { tenantId: tenant.id, ...e } });
    }
  }
  console.log(`  ✅ Events: ${eventData.length} created`);

  console.log(`
─────────────────────────────────────────
✅ Seed data complete for ${tenant.name}!

  Students in Section A: ${sectionAStudents.length} (CSE24001-003)
  Students in Section B: ${sectionBStudents.length} (CSE24004-005)

  Faculty login:  ramesh.cse@mish.edu / Faculty@123
  Student login:  student1@mish.edu   / Student@123
─────────────────────────────────────────
  `);
}

main()
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
