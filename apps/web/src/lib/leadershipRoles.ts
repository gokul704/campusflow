/** Admin-level roles: tenant access matrix, fee structures, portal restrictions, etc. */
export const LEADERSHIP_ROLES = ["ADMIN", "CMD", "PRINCIPAL"] as const;
export type LeadershipRole = (typeof LEADERSHIP_ROLES)[number];

const SET = new Set<string>(LEADERSHIP_ROLES);

export function isLeadershipRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return SET.has(role.toUpperCase());
}
