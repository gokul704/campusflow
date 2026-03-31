import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./assignments.service";

const createSchema = z.object({
  batchCourseId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(),
  maxMarks: z.number().optional(),
  fileUrl: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  maxMarks: z.number().optional(),
  fileUrl: z.string().nullable().optional(),
});

const submitSchema = z.object({
  fileUrl: z.string().optional(),
  remarks: z.string().optional(),
});

const gradeSchema = z.object({
  studentId: z.string(),
  marks: z.number(),
  remarks: z.string().optional(),
});

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchCourseId = req.query.batchCourseId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    res.json(await svc.listAssignments(req.tenant.id, { batchCourseId, batchId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function getOneHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.getAssignment(req.tenant.id, String(req.params.id)));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createAssignment(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateAssignment(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteAssignment(req.tenant.id, String(req.params.id));
    res.json({ message: "Assignment deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function submitHandler(req: Request, res: Response): Promise<void> {
  const r = submitSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return; }
    // Resolve student record for current user
    const { prisma } = await import("@campusflow/db");
    const student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenant.id } });
    if (!student) { res.status(403).json({ error: "Not a student" }); return; }
    res.status(201).json(await svc.submitAssignment(req.tenant.id, String(req.params.id), student.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function gradeHandler(req: Request, res: Response): Promise<void> {
  const r = gradeSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.gradeSubmission(req.tenant.id, String(req.params.id), r.data.studentId, r.data.marks, r.data.remarks));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
