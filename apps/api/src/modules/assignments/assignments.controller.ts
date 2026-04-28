import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@campusflow/db";
import * as svc from "./assignments.service";
import { prisma } from "@campusflow/db";

const createSchema = z.object({
  batchCourseId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(),
  maxMarks: z.number().optional(),
  fileUrl: z.string().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  maxMarks: z.number().optional(),
  fileUrl: z.string().nullable().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
});

const submitSchema = z.object({
  fileUrl: z.string().optional(),
  remarks: z.string().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
});

const gradeSchema = z.object({
  studentId: z.string(),
  marks: z.number(),
  remarks: z.string().optional(),
});

const verifySchema = z.object({
  studentId: z.string(),
});

export async function listHandler(req: Request, res: Response): Promise<void> {
  try {
    const batchCourseId = req.query.batchCourseId as string | undefined;
    let batchId = req.query.batchId as string | undefined;
    if (
      req.user?.id &&
      (req.user.role === Role.STUDENT || req.user.role === Role.GUEST_STUDENT)
    ) {
      const st = await prisma.student.findFirst({
        where: { userId: req.user.id, tenantId: req.tenant.id },
        select: { batchId: true },
      });
      if (!st) {
        res.json([]);
        return;
      }
      batchId = st.batchId;
    }
    res.json(await svc.listAssignments(req.tenant.id, { batchCourseId, batchId }));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function myListHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id, tenantId: req.tenant.id },
      select: { id: true },
    });
    if (!student) {
      res.status(403).json({ error: "Not a student" });
      return;
    }
    res.json(await svc.listMyAssignments(req.tenant.id, student.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function getOneHandler(req: Request, res: Response): Promise<void> {
  try {
    let studentBatchId: string | undefined;
    let studentId: string | undefined;
    if (
      req.user?.role === Role.STUDENT ||
      req.user?.role === Role.GUEST_STUDENT
    ) {
      const st = await prisma.student.findFirst({
        where: { userId: req.user!.id, tenantId: req.tenant.id },
        select: { batchId: true, id: true },
      });
      studentBatchId = st?.batchId;
      studentId = st?.id;
    }
    res.json(
      await svc.getAssignment(
        req.tenant.id,
        String(req.params.id),
        studentBatchId && studentId ? { studentBatchId, studentId } : undefined
      )
    );
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createHandler(req: Request, res: Response): Promise<void> {
  const r = createSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.createAssignment(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
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
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenant.id } });
    if (!student) {
      res.status(403).json({ error: "Not a student" });
      return;
    }
    if (!r.data.fileUrl?.trim() && !r.data.fileBase64?.trim() && !r.data.remarks?.trim()) {
      res.status(400).json({ error: "Provide a file upload, file URL, or remarks" });
      return;
    }
    res.status(201).json(await svc.submitAssignment(req.tenant.id, String(req.params.id), student.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function verifyHandler(req: Request, res: Response): Promise<void> {
  const r = verifySchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json(
      await svc.verifySubmission(req.tenant.id, String(req.params.id), r.data.studentId, req.user.id)
    );
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function gradeHandler(req: Request, res: Response): Promise<void> {
  const r = gradeSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.json(
      await svc.gradeSubmission(
        req.tenant.id,
        String(req.params.id),
        r.data.studentId,
        r.data.marks,
        r.data.remarks
      )
    );
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function downloadSubmissionFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id || !req.user.role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const submissionId = String(req.params.submissionId);
    const { absPath, downloadName } = await svc.assertCanAccessSubmissionFile(
      req.tenant.id,
      submissionId,
      req.user.id,
      req.user.role as Role
    );
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName.replace(/"/g, "")}"`);
    res.sendFile(absPath);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Forbidden") {
      res.status(403).json({ error: msg });
      return;
    }
    res.status(400).json({ error: msg });
  }
}

export async function downloadHandoutFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id || !req.user.role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const assignmentId = String(req.params.assignmentId);
    const { absPath, downloadName } = await svc.assertCanAccessAssignmentHandout(
      req.tenant.id,
      assignmentId,
      req.user.id,
      req.user.role as Role
    );
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName.replace(/"/g, "")}"`);
    res.sendFile(absPath);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Forbidden") {
      res.status(403).json({ error: msg });
      return;
    }
    res.status(400).json({ error: msg });
  }
}
