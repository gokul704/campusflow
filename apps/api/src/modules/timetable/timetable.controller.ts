import { Request, Response } from "express";
import { z } from "zod";
import { Role, prisma } from "@campusflow/db";
import * as svc from "./timetable.service";

const createSchema = z.object({
  batchCourseId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().optional(),
});

const updateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().nullable().optional(),
});

const bulkTimetableRow = z.object({
  batchCourseId: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  batchName: z.string().optional().nullable(),
  sectionName: z.string().optional().nullable(),
  courseCode: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  semester: z.coerce.number().int().min(1).max(20).optional().nullable(),
  dayOfWeek: z.union([z.string(), z.number()]),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().optional().nullable(),
});
const bulkTimetableSchema = z.object({
  rows: z.array(bulkTimetableRow).min(1).max(500),
});

export async function bulkCreateHandler(req: Request, res: Response): Promise<void> {
  const r = bulkTimetableSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.bulkCreateTimetableSlots(req.tenant.id, r.data.rows));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    let batchId = req.query.batchId as string | undefined;
    const batchCourseId = req.query.batchCourseId as string | undefined;
    let facultyId: string | undefined;

    if (req.user?.id && (req.user.role === Role.STUDENT || req.user.role === Role.GUEST_STUDENT)) {
      const student = await prisma.student.findFirst({
        where: { userId: req.user.id, tenantId: req.tenant.id },
        select: { batchId: true },
      });
      if (!student) {
        res.json([]);
        return;
      }
      batchId = student.batchId;
    }

    const teachingFacultyRoles: Role[] = [
      Role.ASSISTANT_PROFESSOR,
      Role.PROFESSOR,
      Role.CLINICAL_STAFF,
      Role.GUEST_PROFESSOR,
    ];
    if (req.user?.id && teachingFacultyRoles.includes(req.user.role as Role)) {
      const faculty = await prisma.faculty.findFirst({
        where: { userId: req.user.id, tenantId: req.tenant.id },
        select: { id: true },
      });
      if (!faculty) {
        res.json([]);
        return;
      }
      facultyId = faculty.id;
    }

    res.json(await svc.listTimetable(req.tenant.id, { batchId, batchCourseId, facultyId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createSlot(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateSlot(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteSlot(req.tenant.id, String(req.params.id));
    res.json({ message: "Timetable slot deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
