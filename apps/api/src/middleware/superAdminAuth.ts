import { Request, Response, NextFunction } from "express";

/**
 * Protects super-admin routes with a static master API key.
 * Set SUPER_ADMIN_API_KEY in your .env file.
 *
 * Usage: router.use(superAdminAuth)
 */
export function superAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.headers["x-super-admin-key"];
  const masterKey = process.env.SUPER_ADMIN_API_KEY;

  if (!masterKey) {
    res.status(500).json({ error: "Super admin key not configured" });
    return;
  }

  if (!key || key !== masterKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
