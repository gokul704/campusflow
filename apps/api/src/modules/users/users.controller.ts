import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@campusflow/db";
import * as usersService from "./users.service";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const { role, departmentId, search, page, limit } = req.query;

  const result = await usersService.listUsers({
    tenantId: req.tenant.id,
    role: role as Role | undefined,
    departmentId: departmentId as string | undefined,
    search: search as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
}

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await usersService.getUser(req.tenant.id, String(String(req.params.id)));
    res.json(user);
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = await usersService.updateUser(req.tenant.id, String(req.params.id), result.data);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    res.status(400).json({ error: message });
  }
}

export async function deactivateUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await usersService.setUserActive(req.tenant.id, String(req.params.id), false);
    res.json(user);
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}

export async function activateUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await usersService.setUserActive(req.tenant.id, String(req.params.id), true);
    res.json(user);
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}
