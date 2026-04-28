import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@campusflow/db";
import * as usersService from "./users.service";

const createDirectUserSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.nativeEnum(Role),
    password: z.string().min(8).optional(),
    phone: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
    qualification: z.string().optional().nullable(),
    experience: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === Role.ASSISTANT_PROFESSOR ||
      data.role === Role.PROFESSOR ||
      data.role === Role.CLINICAL_STAFF ||
      data.role === Role.GUEST_PROFESSOR
    ) {
      if (!data.departmentId?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for lecturer", path: ["departmentId"] });
      }
      if (!data.designation?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for lecturer", path: ["designation"] });
      }
    }
  });

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

const changeRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export async function createDirectUserHandler(req: Request, res: Response): Promise<void> {
  const result = createDirectUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  try {
    const user = await usersService.createDirectUser(req.tenant.id, result.data);
    res.status(201).json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Create failed";
    res.status(400).json({ error: message });
  }
}

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

export async function changeUserRoleHandler(req: Request, res: Response): Promise<void> {
  const result = changeRoleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  try {
    const user = await usersService.setUserRole(req.tenant.id, String(req.params.id), result.data.role);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Role update failed";
    res.status(400).json({ error: message });
  }
}
