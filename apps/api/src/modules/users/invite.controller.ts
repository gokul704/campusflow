import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@campusflow/db";
import * as inviteService from "./invite.service";

const sendInviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

export async function sendInviteHandler(req: Request, res: Response): Promise<void> {
  const result = sendInviteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const appUrl = process.env.APP_URL ?? `http://localhost:3001`;

  try {
    await inviteService.createInvite(
      req.tenant.id,
      result.data.email,
      result.data.role,
      req.user!.id,
      appUrl
    );
    res.json({ message: `Invite sent to ${result.data.email}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send invite";
    res.status(400).json({ error: message });
  }
}

export async function getInviteInfoHandler(req: Request, res: Response): Promise<void> {
  try {
    const info = await inviteService.getInviteInfo(String(req.params.token));
    res.json(info);
  } catch {
    res.status(404).json({ error: "Invalid or expired invite link" });
  }
}

export async function acceptInviteHandler(req: Request, res: Response): Promise<void> {
  const result = acceptInviteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const user = await inviteService.acceptInvite(
      result.data.token,
      result.data.password,
      result.data.firstName,
      result.data.lastName
    );
    res.json({ message: "Account created. You can now login.", user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invite";
    res.status(400).json({ error: message });
  }
}
