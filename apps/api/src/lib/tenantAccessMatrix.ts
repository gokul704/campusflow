import { Role } from "@campusflow/db";
import type { Request, Response, NextFunction } from "express";

export const MODULE_KEYS = [
  "dashboard",
  "onboarding",
  "students",
  "faculty",
  "users",
  "courses",
  "batches",
  "sections",
  "departments",
  "fees",
  "events",
  "batchCourses",
  "timetable",
  "attendance",
  "assignments",
  "examGrades",
  "reports",
  "settings",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ModulePerm = { view: boolean; create: boolean; edit: boolean; delete: boolean };

const ALL: ModulePerm = { view: true, create: true, edit: true, delete: true };
const VO: ModulePerm = { view: true, create: false, edit: false, delete: false };
const VCE: ModulePerm = { view: true, create: true, edit: true, delete: false };

function empty(): Record<ModuleKey, ModulePerm> {
  return Object.fromEntries(MODULE_KEYS.map((k) => [k, { ...VO, view: false }])) as Record<ModuleKey, ModulePerm>;
}

function fill(base: Record<ModuleKey, ModulePerm>, patch: Partial<Record<ModuleKey, Partial<ModulePerm>>>): void {
  for (const k of MODULE_KEYS) {
    const p = patch[k];
    if (!p) continue;
    base[k] = {
      view: p.view ?? base[k].view,
      create: p.create ?? base[k].create,
      edit: p.edit ?? base[k].edit,
      delete: p.delete ?? base[k].delete,
    };
  }
}

/** Baseline permissions when `Tenant.accessMatrix` is null. Mirrors current coarse role behaviour. */
function defaultMatrixForRole(role: Role): Record<ModuleKey, ModulePerm> {
  const m = empty();
  if (role === Role.ADMIN) {
    MODULE_KEYS.forEach((k) => {
      m[k] = { ...ALL };
    });
    return m;
  }
  if (role === Role.CMD || role === Role.PRINCIPAL) {
    MODULE_KEYS.forEach((k) => {
      m[k] = { ...ALL };
    });
    m.onboarding = { view: false, create: false, edit: false, delete: false };
    return m;
  }

  if (role === Role.STAFF || role === Role.OPERATIONS_LECTURER) {
    fill(m, {
      dashboard: VO,
      students: VO,
      faculty: VO,
      users: VO,
      courses: VO,
      batchCourses: VO,
      timetable: VO,
      assignments: VO,
      examGrades: VO,
      reports: VO,
      settings: VO,
    });
    return m;
  }

  if (role === Role.OPERATIONS_HR || role === Role.OPERATIONS_FRONT_DESK) {
    MODULE_KEYS.forEach((k) => {
      m[k] = { ...ALL };
    });
    m.reports = { view: true, create: false, edit: false, delete: false };
    return m;
  }

  if (role === Role.PRESENT_STUDENT) {
    fill(m, {
      dashboard: VO,
      students: VO,
      faculty: VO,
      users: VO,
      courses: VO,
      batches: VO,
      sections: VO,
      departments: VO,
      /** Own fee rows only (API filters by user). */
      fees: VO,
      events: VO,
      batchCourses: VO,
      timetable: VO,
      attendance: VO,
      assignments: VCE,
      examGrades: VO,
      reports: VO,
      settings: VO,
    });
    return m;
  }

  if (role === Role.ALUMNI) {
    fill(m, {
      dashboard: VO,
      examGrades: VO,
      reports: VO,
      settings: VO,
    });
    return m;
  }

  if (role === Role.GUEST_STUDENT) {
    fill(m, {
      dashboard: VO,
      assignments: VO,
      settings: VO,
    });
    return m;
  }

  fill(m, {
    dashboard: VO,
    settings: VO,
  });
  return m;
}

type StoredMatrix = Partial<Record<string, Partial<Record<string, Partial<ModulePerm>>>>>;

function parseStored(raw: unknown): StoredMatrix {
  if (!raw || typeof raw !== "object") return {};
  return raw as StoredMatrix;
}

export function getEffectivePermissions(
  role: Role,
  tenantMatrix: unknown | null | undefined
): Record<ModuleKey, ModulePerm> {
  const base = defaultMatrixForRole(role);
  const stored = parseStored(tenantMatrix);
  const rolePatch = stored[role] ?? stored[String(role)];
  if (rolePatch) fill(base, rolePatch as Partial<Record<ModuleKey, Partial<ModulePerm>>>);
  return base;
}

export function requireModuleAction(module: ModuleKey, action: keyof ModulePerm) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const perms = getEffectivePermissions(req.user.role as Role, req.tenant.accessMatrix);
    const cell = perms[module];
    if (!cell?.[action]) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
