import { Request, Response } from "express";
import { z } from "zod";
import { PaymentStatus, Role } from "@campusflow/db";
import * as svc from "./fees.service";

const feeStructureSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  isRecurring: z.boolean().optional(),
  isAdmissionFee: z.boolean().optional(),
});

const feeStructureUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  isRecurring: z.boolean().optional(),
  isAdmissionFee: z.boolean().optional(),
});

const paymentCreateSchema = z
  .object({
    feeStructureId: z.string(),
    studentId: z.string().optional(),
    applicantUserId: z.string().optional(),
  })
  .refine((d) => Boolean(d.studentId) !== Boolean(d.applicantUserId), {
    message: "Provide exactly one of studentId or applicantUserId",
  });

const paymentStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
  paidAt: z.string().optional(),
});

export async function listStructuresHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json(await svc.listFeeStructures(req.tenant.id));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createStructureHandler(req: Request, res: Response): Promise<void> {
  const r = feeStructureSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createFeeStructure(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updateStructureHandler(req: Request, res: Response): Promise<void> {
  const r = feeStructureUpdateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updateFeeStructure(req.tenant.id, String(req.params.id), r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function deleteStructureHandler(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteFeeStructure(req.tenant.id, String(req.params.id));
    res.json({ message: "Fee structure deleted" });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function listPaymentsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, feeStructureId, status } = req.query as Record<string, string | undefined>;
    const restrictToStudentUserId =
      req.user!.role === Role.PRESENT_STUDENT || req.user!.role === Role.GUEST_STUDENT || req.user!.role === Role.ALUMNI
        ? req.user!.id
        : undefined;
    res.json(
      await svc.getFeePayments(
        req.tenant.id,
        {
          studentId,
          feeStructureId,
          status: status as PaymentStatus | undefined,
        },
        restrictToStudentUserId ? { restrictToStudentUserId } : undefined
      )
    );
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const r = paymentCreateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.status(201).json(await svc.createFeePayment(req.tenant.id, r.data));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function updatePaymentStatusHandler(req: Request, res: Response): Promise<void> {
  const r = paymentStatusSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: r.error.flatten() }); return; }
  try {
    res.json(await svc.updatePaymentStatus(req.tenant.id, String(req.params.id), r.data.status as PaymentStatus, r.data.paidAt));
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
