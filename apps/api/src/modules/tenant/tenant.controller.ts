import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@campusflow/db";

const accessMatrixSchema = z.object({
  accessMatrix: z.any().nullable(),
});

export async function getAccessSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      select: { accessMatrix: true },
    });
    res.json({ accessMatrix: t?.accessMatrix ?? null });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}

export async function putAccessSettingsHandler(req: Request, res: Response): Promise<void> {
  const r = accessMatrixSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: r.error.flatten() });
    return;
  }
  try {
    const updated = await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: { accessMatrix: r.data.accessMatrix },
      select: { accessMatrix: true },
    });
    res.json(updated);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
  }
}
