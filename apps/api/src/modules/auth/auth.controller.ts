import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const data = await authService.login(
      req.tenant.id,
      result.data.email,
      result.data.password
    );
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
}

export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  const result = forgotSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  await authService.forgotPassword(req.tenant.id, result.data.email);

  // Always return 200 to prevent email enumeration
  res.json({ message: "If this email exists, an OTP has been sent." });
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const result = resetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    await authService.resetPassword(
      req.tenant.id,
      result.data.email,
      result.data.otp,
      result.data.newPassword
    );
    res.json({ message: "Password reset successful. Please login." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    res.status(400).json({ error: message });
  }
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    await authService.changePassword(
      req.user!.id,
      result.data.currentPassword,
      result.data.newPassword
    );
    res.json({ message: "Password changed successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Change failed";
    res.status(400).json({ error: message });
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}
