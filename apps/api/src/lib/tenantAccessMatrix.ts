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
  "departments",
  "fees",
  "events",
  "batchCourses",
  "timetable",
  "attendance",
  "assignments",
  "examGrades",
  "reports",
  "digitalLibrary",
  "settings",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ModulePerm = { view: boolean; create: boolean; edit: boolean; delete: boolean };

const ALL: ModulePerm = { view: true, create: true, edit: true, delete: true };
const VO: ModulePerm = { view: true, create: false, edit: false, delete: false };
const VCE: ModulePerm = { view: true, create: true, edit: true, delete: false };
const NONE: ModulePerm = { view: false, create: false, edit: false, delete: false };

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
  if (role === Role.ADMIN || role === Role.CMD || role === Role.PRINCIPAL) {
    MODULE_KEYS.forEach((k) => {
      m[k] = { ...ALL };
    });
    // Leadership parity: Admin, Chairman, Principal share identical default access.
    return m;
  }

  if (
    role === Role.ASSISTANT_PROFESSOR ||
    role === Role.PROFESSOR ||
    role === Role.CLINICAL_STAFF ||
    role === Role.GUEST_PROFESSOR
  ) {
    fill(m, {
      dashboard: ALL,
      batchCourses: VO,
      timetable: VO,
      attendance: { ...NONE },
      assignments: ALL,
      examGrades: VCE,
      reports: VO,
      students: VO,
      events: ALL,
      digitalLibrary: VO,
      // No access by default
      faculty: { ...NONE },
      users: { ...NONE },
      courses: { ...NONE },
      batches: { ...NONE },
      departments: { ...NONE },
      fees: { ...NONE },
      settings: { ...NONE },
    });
    return m;
  }

  if (role === Role.OPERATIONS) {
    // Operations profile
    fill(m, {
      dashboard: ALL,
      reports: ALL,
      students: ALL,
      faculty: ALL,
      fees: VO, // view + download style access
      events: ALL,
      digitalLibrary: VO,
      settings: { ...NONE },
      batchCourses: { ...NONE },
      timetable: { ...NONE },
      attendance: { ...NONE },
      assignments: { ...NONE },
      examGrades: { ...NONE },
      users: { ...NONE },
      courses: { ...NONE },
      batches: { ...NONE },
      departments: { ...NONE },
    });
    return m;
  }

  if (role === Role.ACCOUNTS) {
    // Accounts profile
    fill(m, {
      dashboard: ALL,
      reports: ALL,
      students: ALL,
      faculty: ALL,
      fees: ALL,
      events: ALL,
      digitalLibrary: VO,
      settings: { ...NONE },
      batchCourses: { ...NONE },
      timetable: { ...NONE },
      attendance: { ...NONE },
      assignments: { ...NONE },
      examGrades: { ...NONE },
      users: { ...NONE },
      courses: { ...NONE },
      batches: { ...NONE },
      departments: { ...NONE },
    });
    return m;
  }

  if (role === Role.IT_STAFF) {
    // Accounts IT / technical profile
    fill(m, {
      dashboard: ALL,
      batchCourses: VO,
      timetable: VO,
      reports: ALL,
      students: ALL,
      faculty: ALL,
      users: ALL,
      fees: ALL,
      events: ALL,
      settings: ALL,
      digitalLibrary: VO,
      attendance: { ...NONE },
      assignments: { ...NONE },
      examGrades: { ...NONE },
      courses: { ...NONE },
      batches: { ...NONE },
      departments: { ...NONE },
    });
    return m;
  }

  if (role === Role.STUDENT) {
    fill(m, {
      dashboard: VO,
      students: VO,
      faculty: VO,
      users: VO,
      courses: VO,
      batches: VO,
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
      digitalLibrary: VO,
      settings: VO,
    });
    return m;
  }

  if (role === Role.ALUMNI) {
    fill(m, {
      dashboard: VO,
      examGrades: VO,
      reports: VO,
      digitalLibrary: VO,
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

function clampByRole(role: Role, perms: Record<ModuleKey, ModulePerm>): Record<ModuleKey, ModulePerm> {
  const restrictTo = (allowed: ModuleKey[]) => {
    const allow = new Set<ModuleKey>(allowed);
    for (const k of MODULE_KEYS) {
      if (!allow.has(k)) perms[k] = { ...NONE };
    }
  };

  const leadershipRoles = new Set<Role>([Role.ADMIN, Role.CMD, Role.PRINCIPAL]);

  if (role === Role.STUDENT) {
    restrictTo([
      "dashboard",
      "fees",
      "events",
      "batchCourses",
      "timetable",
      "attendance",
      "assignments",
      "examGrades",
      "digitalLibrary",
      "settings",
    ]);
  } else if (role === Role.GUEST_STUDENT) {
    restrictTo([
      "dashboard",
      "assignments",
      "events",
      "digitalLibrary",
      "settings",
    ]);
  } else if (
    role === Role.ASSISTANT_PROFESSOR ||
    role === Role.PROFESSOR ||
    role === Role.CLINICAL_STAFF ||
    role === Role.GUEST_PROFESSOR
  ) {
    restrictTo([
      "dashboard",
      "batchCourses",
      "timetable",
      "assignments",
      "examGrades",
      "reports",
      "students",
      "events",
      "digitalLibrary",
      "settings",
    ]);
    // Always read-only: allocations and slots are managed by office / leadership only.
    perms.batchCourses = {
      view: perms.batchCourses.view,
      create: false,
      edit: false,
      delete: false,
    };
    perms.timetable = {
      view: perms.timetable.view,
      create: false,
      edit: false,
      delete: false,
    };
  }

  // Global policy: create/edit/delete actions are leadership-only.
  if (!leadershipRoles.has(role)) {
    for (const k of MODULE_KEYS) {
      perms[k] = { ...perms[k], create: false, edit: false, delete: false };
    }
  }

  // Cashiers record fee payments (not fee structures — those routes still require leadership via `authorize`).
  if (role === Role.ACCOUNTS) {
    perms.fees = { view: perms.fees.view, create: true, edit: true, delete: false };
  }

  return perms;
}

export function getEffectivePermissions(
  role: Role,
  tenantMatrix: unknown | null | undefined
): Record<ModuleKey, ModulePerm> {
  const base = defaultMatrixForRole(role);
  const stored = parseStored(tenantMatrix);
  const rolePatch = stored[role] ?? stored[String(role)];
  if (rolePatch) fill(base, rolePatch as Partial<Record<ModuleKey, Partial<ModulePerm>>>);
  return clampByRole(role, base);
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
