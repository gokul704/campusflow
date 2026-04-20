import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./students.service";

const createStudentUnifiedSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    password: z.string().min(8).optional(),
    phone: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    batchId: z.string().optional(),
    sectionId: z.string().optional(),
    batchName: z.string().optional().nullable(),
    sectionName: z.string().optional().nullable(),
    rollNumber: z.string().min(1),
    parentName: z.string().optional().nullable(),
    parentPhone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
  })
  .superRefine((d, ctx) => {
    const idOk = !!(d.batchId?.trim() && d.sectionId?.trim());
    const nameOk = !!(d.batchName?.trim() && d.sectionName?.trim());
    if (!idOk && !nameOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide batchName and sectionName, or batchId and sectionId.",
        path: ["batchName"],
      });
    }
  });

const bulkStudentSchema = z.object({
  defaultPassword: z.string().min(8).optional(),
  rows: z.array(createStudentUnifiedSchema).min(1).max(500),
});

const updateSchema = z.object({
  batchId: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

export async function listStudentsHandler(req: Request, res: Response): Promise<void> {
  const { batchId, sectionId, search, page, limit } = req.query;
  res.json(await svc.listStudents(
    req.tenant.id,
    batchId as string | undefined,
    sectionId as string | undefined,
    search as string | undefined,
    page ? Number(page) : 1,
    limit ? Number(limit) : 20
  ));
}

export async function getStudentHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.getStudent(req.tenant.id, String(req.params.id)));
  } catch { res.status(404).json({ error: "Student not found" }); }
}

export async function createStudentHandler(req: Request, res: Response): Promise<void> {
  const r = createStudentUnifiedSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    res.status(201).json(await svc.createStudentWithUser(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function bulkCreateStudentsHandler(req: Request, res: Response): Promise<void> {
  const r = bulkStudentSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    const out = await svc.bulkCreateStudentsWithUsers(
      req.tenant.id,
      r.data.rows,
      r.data.defaultPassword
    );
    res.status(201).json(out);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateStudentHandler(req: Request, res: Response): Promise<void> {
  const r = updateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateStudentProfile(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "Failed" }); }
}

const portalAccessSchema = z.object({
  action: z.enum(["lift", "restrict"]),
  until: z.string().optional(),
  reason: z.string().optional(),
});

export async function listRestrictedStudentsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.listRestrictedPortalStudents(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function studentPortalAccessHandler(req: Request, res: Response): Promise<void> {
  const r = portalAccessSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    const out = await svc.updateStudentPortalAccess(
      req.tenant.id,
      String(req.params.id),
      req.user!.id,
      r.data
    );
    res.json(out);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
