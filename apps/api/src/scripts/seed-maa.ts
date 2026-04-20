#!/usr/bin/env tsx
/**
 * MAA Institute of Speech & Hearing — demo academic data + 10 users (one per Role).
 *
 * Standalone: targets the same slug as the rest of the app — in order:
 *   --slug=...  →  SINGLE_TENANT_SLUG in .env  →  only tenant in DB (if exactly one).
 * Does not invent a second slug (e.g. maa-ish) when your .env already names one institute.
 *
 * Usage (repo root, DATABASE_URL in .env):
 *   npm run api:seed:maa
 *   npm run api:seed:maa -- --slug=mish --password=YourPassword123
 *
 * Only updates an **existing** tenant (never creates one). Run `npm run api:seed`
 * first with the same slug. Re-run safe (upserts).
 */

import { prisma, Role, EventType } from "@campusflow/db";
import bcrypt from "bcryptjs";
import {
  printStandaloneSlugHint,
  printTenantSlugResolutionFailure,
  resolveTenantSlugForSeed,
} from "./resolveTenantSlugForSeed";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    args[key] = rest.join("=");
  }
  return args;
}

type RoleRow = { role: Role; key: string; firstName: string; lastName: string };

const ROLE_ROWS: RoleRow[] = [
  { role: Role.ADMIN, key: "admin-portal", firstName: "Lakshmi", lastName: "Venkatesh" },
  { role: Role.CMD, key: "cmd", firstName: "Dr. Suresh", lastName: "Ramachandran" },
  { role: Role.PRINCIPAL, key: "principal", firstName: "Dr. Deepa", lastName: "Krishnamurthy" },
  { role: Role.STAFF, key: "staff", firstName: "Karthik", lastName: "Subramanian" },
  { role: Role.OPERATIONS_LECTURER, key: "lecturer", firstName: "Anitha", lastName: "Mohan" },
  { role: Role.OPERATIONS_HR, key: "hr", firstName: "Meera", lastName: "Krishnan" },
  { role: Role.OPERATIONS_FRONT_DESK, key: "frontdesk", firstName: "Divya", lastName: "Ramesh" },
  { role: Role.PRESENT_STUDENT, key: "student", firstName: "Arjun", lastName: "Venkatesh" },
  { role: Role.ALUMNI, key: "alumni", firstName: "Sanjay", lastName: "Iyer" },
  { role: Role.GUEST_STUDENT, key: "guest", firstName: "Neha", lastName: "Kapoor" },
];

async function ensureFaculty(
  tenantId: string,
  departmentId: string,
  passwordHash: string,
  row: { email: string; firstName: string; lastName: string; designation: string; qualification?: string | null }
) {
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: row.email } },
    create: {
      tenantId,
      email: row.email,
      password: passwordHash,
      firstName: row.firstName,
      lastName: row.lastName,
      role: Role.OPERATIONS_LECTURER,
    },
    update: {
      password: passwordHash,
      firstName: row.firstName,
      lastName: row.lastName,
      role: Role.OPERATIONS_LECTURER,
      isActive: true,
    },
  });
  const fac = await prisma.faculty.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tenantId,
      departmentId,
      designation: row.designation,
      qualification: row.qualification ?? null,
    },
    update: {
      departmentId,
      designation: row.designation,
      qualification: row.qualification ?? null,
    },
  });
  return fac.id;
}

async function main() {
  const args = parseArgs();
  const slug = await resolveTenantSlugForSeed(args["slug"]);
  if (!slug) {
    console.error("❌ Could not determine tenant slug.");
    printStandaloneSlugHint();
    await printTenantSlugResolutionFailure();
    process.exit(1);
  }

  const password = args["password"] ?? "MaaDemo@2026";

  console.log(`\n🌱 MAA Institute seed (slug=${slug})\n`);

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(
      `❌ No tenant with slug "${slug}". This script only adds data to an existing institute.\n` +
        `   Run first: npm run api:seed -- --slug=${slug} --name="Your Institute" --email=admin@example.edu --password=...\n` +
        `   Then run this seed again.`
    );
    printStandaloneSlugHint();
    process.exit(1);
  }
  console.log(`  ✅ Using existing tenant: ${tenant.name}`);

  const tid = tenant.id;

  // ── Departments ─────────────────────────────────────────────
  const deptAud = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tid, code: "AUD" } },
    create: { tenantId: tid, name: "Audiology & Allied Sciences", code: "AUD" },
    update: { name: "Audiology & Allied Sciences" },
  });
  const deptBaslp = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tid, code: "BASLP" } },
    create: { tenantId: tid, name: "BASLP Programme", code: "BASLP" },
    update: { name: "BASLP Programme" },
  });
  console.log(`  ✅ Departments: ${deptAud.code}, ${deptBaslp.code}`);

  // ── Batch & sections (M.Sc Aud — clinical batches) ──────────
  const batchName = "M.Sc(Aud) 2025-2027";
  let batch = await prisma.batch.findFirst({ where: { tenantId: tid, name: batchName } });
  if (!batch) {
    batch = await prisma.batch.create({
      data: { tenantId: tid, name: batchName, startYear: 2025, endYear: 2027, isActive: true },
    });
  }
  const secI =
    (await prisma.section.findUnique({ where: { batchId_name: { batchId: batch.id, name: "Batch I" } } })) ??
    (await prisma.section.create({ data: { tenantId: tid, batchId: batch.id, name: "Batch I" } }));
  const secII =
    (await prisma.section.findUnique({ where: { batchId_name: { batchId: batch.id, name: "Batch II" } } })) ??
    (await prisma.section.create({ data: { tenantId: tid, batchId: batch.id, name: "Batch II" } }));
  console.log(`  ✅ Batch ${batchName} + sections Batch I, Batch II`);

  // ── M.Sc(Aud) Sem II courses ─────────────────────────────────
  const mscCourses: Array<{ code: string; name: string; credits: number }> = [
    { code: "AUD201M", name: "Physiological Assessment of Hearing", credits: 4 },
    { code: "AUD202M", name: "Auditory Disorders", credits: 4 },
    { code: "AUD203M", name: "Speech Perception", credits: 4 },
    { code: "AUD204MO", name: "Minor (Optional) – Bioethics (or) Entrepreneurship", credits: 3 },
    { code: "AUD206M", name: "Clinicals in Audiology", credits: 6 },
  ];

  const courseIds: Record<string, string> = {};
  for (const c of mscCourses) {
    const course = await prisma.course.upsert({
      where: { tenantId_code: { tenantId: tid, code: c.code } },
      create: {
        tenantId: tid,
        code: c.code,
        name: c.name,
        credits: c.credits,
        isCommon: false,
        departmentId: deptAud.id,
      },
      update: { name: c.name, credits: c.credits, departmentId: deptAud.id },
    });
    courseIds[c.code] = course.id;
  }

  // BASLP II sample papers (from prospectus)
  const baslpCourses: Array<{ code: string; name: string; credits: number }> = [
    { code: "B21M", name: "Child Language Disorders", credits: 4 },
    { code: "B22M", name: "Diagnostic Audiology - Basic", credits: 4 },
    { code: "B23MC", name: "Linguistics and Phonetics", credits: 3 },
    { code: "B24MC", name: "Electronics and Acoustics", credits: 3 },
  ];
  for (const c of baslpCourses) {
    const course = await prisma.course.upsert({
      where: { tenantId_code: { tenantId: tid, code: c.code } },
      create: {
        tenantId: tid,
        code: c.code,
        name: c.name,
        credits: c.credits,
        isCommon: false,
        departmentId: deptBaslp.id,
      },
      update: { name: c.name, credits: c.credits, departmentId: deptBaslp.id },
    });
    courseIds[c.code] = course.id;
  }
  console.log(`  ✅ Courses: M.Sc(Aud) + BASLP sample (${Object.keys(courseIds).length} papers)`);

  // ── Faculty (login emails @maa.demo) ─────────────────────────
  const passwordHash = await bcrypt.hash(password, 12);
  const facSandhra = await ensureFaculty(tid, deptAud.id, passwordHash, {
    email: "sandhra.s@maa.demo",
    firstName: "Sandhra",
    lastName: "S",
    designation: "Assistant Professor",
    qualification: "M.Sc (Aud)",
  });
  const facSailaja = await ensureFaculty(tid, deptAud.id, passwordHash, {
    email: "sailaja@maa.demo",
    firstName: "Sailaja",
    lastName: "Dr",
    designation: "Professor",
    qualification: "PhD",
  });
  const facAparna = await ensureFaculty(tid, deptAud.id, passwordHash, {
    email: "aparna.r@maa.demo",
    firstName: "Aparna",
    lastName: "R",
    designation: "Reader",
    qualification: "PhD",
  });
  const facMadhavi = await ensureFaculty(tid, deptAud.id, passwordHash, {
    email: "madhavi@maa.demo",
    firstName: "Madhavi",
    lastName: "Dr",
    designation: "Guest Faculty",
    qualification: "PhD",
  });
  const facGish = await ensureFaculty(tid, deptAud.id, passwordHash, {
    email: "gish@maa.demo",
    firstName: "Gish",
    lastName: "Chacko",
    designation: "Lecturer",
    qualification: "M.Sc",
  });
  const facByEmail: Record<string, string> = {
    "sandhra.s@maa.demo": facSandhra,
    "sailaja@maa.demo": facSailaja,
    "aparna.r@maa.demo": facAparna,
    "madhavi@maa.demo": facMadhavi,
    "gish@maa.demo": facGish,
  };
  console.log(`  ✅ Faculty users (password = demo password): sandhra.s@maa.demo, sailaja@maa.demo, …`);

  // ── Batch courses (Batch I, Semester 2) ─────────────────────
  const semester = 2;
  const batchCourseIds: string[] = [];
  const links: Array<{ code: string; facultyEmail: string }> = [
    { code: "AUD201M", facultyEmail: "sandhra.s@maa.demo" },
    { code: "AUD202M", facultyEmail: "sailaja@maa.demo" },
    { code: "AUD203M", facultyEmail: "aparna.r@maa.demo" },
    { code: "AUD204MO", facultyEmail: "madhavi@maa.demo" },
    { code: "AUD206M", facultyEmail: "sandhra.s@maa.demo" },
  ];
  for (const { code, facultyEmail } of links) {
    const bc = await prisma.batchCourse.upsert({
      where: {
        sectionId_courseId_semester: {
          sectionId: secI.id,
          courseId: courseIds[code]!,
          semester,
        },
      },
      create: {
        tenantId: tid,
        batchId: batch.id,
        sectionId: secI.id,
        courseId: courseIds[code]!,
        semester,
        facultyId: facByEmail[facultyEmail] ?? null,
      },
      update: { facultyId: facByEmail[facultyEmail] ?? null },
    });
    batchCourseIds.push(bc.id);
  }
  console.log(`  ✅ Batch courses: Batch I · Sem ${semester} (${links.length} papers)`);

  // ── Timetable (Mon / Fri lecture blocks from sample) ────────
  const aud201 = await prisma.batchCourse.findFirst({
    where: { tenantId: tid, sectionId: secI.id, courseId: courseIds["AUD201M"]!, semester },
  });
  if (aud201) {
    const slots = [
      { dayOfWeek: 0, startTime: "09:00", endTime: "10:00", room: "Audiology Hall" },
      { dayOfWeek: 0, startTime: "10:00", endTime: "11:00", room: "Audiology Hall" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "10:00", room: "Audiology Hall" },
    ];
    for (const s of slots) {
      const exists = await prisma.timetable.findFirst({
        where: {
          tenantId: tid,
          batchCourseId: aud201.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
        },
      });
      if (!exists) {
        await prisma.timetable.create({
          data: { tenantId: tid, batchCourseId: aud201.id, ...s },
        });
      }
    }
    console.log(`  ✅ Timetable: ${slots.length} slots (AUD201M · Mon/Fri sample)`);
  }

  // ── Academic calendar events (M.Sc + BASLP mix) ─────────────
  const events: Array<{
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date | null;
    eventType: EventType;
  }> = [
    {
      title: "M.Sc(Aud) Sem I — Commencement of classes",
      description: "Sem I",
      startDate: new Date("2025-10-29T00:00:00.000Z"),
      eventType: EventType.EVENT,
    },
    {
      title: "M.Sc(Aud) Sem II — Commencement of classes",
      description: "Sem II",
      startDate: new Date("2026-03-23T00:00:00.000Z"),
      eventType: EventType.EVENT,
    },
    {
      title: "Journal Club presentations",
      description: "Every month during Dr.Sailaja visit",
      startDate: new Date("2025-11-15T00:00:00.000Z"),
      eventType: EventType.WORKSHOP,
    },
    {
      title: "M.Sc(Aud) Sem I — Mid term examinations",
      startDate: new Date("2025-12-15T00:00:00.000Z"),
      endDate: new Date("2025-12-19T00:00:00.000Z"),
      eventType: EventType.EXAM,
    },
    {
      title: "M.Sc(Aud) Sem II — Mid term examinations",
      startDate: new Date("2026-05-11T00:00:00.000Z"),
      endDate: new Date("2026-05-14T00:00:00.000Z"),
      eventType: EventType.EXAM,
    },
    {
      title: "M.Sc(Aud) Sem I — Last date of instruction",
      startDate: new Date("2026-01-31T00:00:00.000Z"),
      eventType: EventType.EVENT,
    },
    {
      title: "M.Sc(Aud) Sem II — Last date of instruction",
      startDate: new Date("2026-06-30T00:00:00.000Z"),
      eventType: EventType.EVENT,
    },
    {
      title: "Internal Practical Exam (Sem I)",
      startDate: new Date("2026-02-02T00:00:00.000Z"),
      eventType: EventType.EXAM,
    },
    {
      title: "Semester examinations (Sem I)",
      description: "2nd week of February",
      startDate: new Date("2026-02-09T00:00:00.000Z"),
      endDate: new Date("2026-02-13T00:00:00.000Z"),
      eventType: EventType.EXAM,
    },
    {
      title: "BASLP Sem II — Commencement of classes",
      startDate: new Date("2026-04-27T00:00:00.000Z"),
      eventType: EventType.EVENT,
    },
    {
      title: "BASLP Sem II — Mid term examinations",
      startDate: new Date("2026-06-08T00:00:00.000Z"),
      endDate: new Date("2026-06-13T00:00:00.000Z"),
      eventType: EventType.EXAM,
    },
    {
      title: "BASLP Sem II — Semester end vacation",
      startDate: new Date("2026-08-14T00:00:00.000Z"),
      endDate: new Date("2026-08-30T00:00:00.000Z"),
      eventType: EventType.HOLIDAY,
    },
  ];

  let evCount = 0;
  for (const e of events) {
    const exists = await prisma.event.findFirst({
      where: { tenantId: tid, title: e.title, startDate: e.startDate },
    });
    if (!exists) {
      await prisma.event.create({
        data: {
          tenantId: tid,
          title: e.title,
          description: e.description ?? null,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          eventType: e.eventType,
        },
      });
      evCount++;
    }
  }
  console.log(`  ✅ Events: ${evCount} new (${events.length} defined, skips duplicates)`);

  // ── 10 users — one per Role (same pattern as seed-role-users) ─
  console.log(`\n  👥 Role demo accounts (password: ${password})\n`);
  for (const row of ROLE_ROWS) {
    const email = `${slug}.${row.key}@roles.demo`;
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tid, email } },
      create: {
        tenantId: tid,
        email,
        password: passwordHash,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
      },
      update: {
        password: passwordHash,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        isActive: true,
      },
    });
    console.log(`     ${row.role.padEnd(22)} ${email}`);
  }

  console.log(`
────────────────────────────────────────────────────────────────
✅ MAA seed complete

Tenant slug:     ${slug}
Tenant name:     ${tenant.name}
Public key:      ${tenant.publicKey}

Faculty logins (same password as --password):
  sandhra.s@maa.demo  sailaja@maa.demo  aparna.r@maa.demo
  madhavi@maa.demo    gish@maa.demo

Role demo logins (10 roles):
  ${slug}.admin-portal@roles.demo … ${slug}.guest@roles.demo
  Password: ${password}

Set in repo-root .env for local dev:
  SINGLE_TENANT_SLUG=${slug}
────────────────────────────────────────────────────────────────
`);
}

main()
  .catch((e) => {
    console.error("❌ seed-maa failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
