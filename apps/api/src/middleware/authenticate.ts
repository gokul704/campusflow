import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@campusflow/db";
import { prisma } from "@campusflow/db";

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const tokenFromQuery = typeof req.query.token === "string" ? req.query.token.trim() : "";
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : tokenFromQuery;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Ensure token belongs to the current tenant
    if (payload.tenantId !== req.tenant.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const dbUser = await prisma.user.findFirst({
      where: { id: payload.userId, tenantId: payload.tenantId },
      select: { id: true, tenantId: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = {
      id: dbUser.id,
      tenantId: dbUser.tenantId,
      email: dbUser.email,
      role: dbUser.role,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
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
