import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@campusflow/db";

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Ensure token belongs to the current tenant
    if (payload.tenantId !== req.tenant.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
