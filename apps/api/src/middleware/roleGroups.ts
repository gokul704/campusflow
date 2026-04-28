import { Role } from "@campusflow/db";

/** Admin, CMD, Principal — user management, direct account creation, activation, fee reports. */
export const LEADERSHIP_ROLES: Role[] = [Role.ADMIN, Role.CMD, Role.PRINCIPAL];

/** Leadership plus office & operations (non-teaching). */
export const OFFICE_ROLES: Role[] = [
  ...LEADERSHIP_ROLES,
  Role.OPERATIONS,
  Role.ACCOUNTS,
  Role.IT_STAFF,
];

/** Creating / completing a linked Student profile (leadership + HR). */
export const STUDENT_CREATE_ROLES: Role[] = [...LEADERSHIP_ROLES, Role.OPERATIONS];

/** Manual portal suspension / lift — Admin, CMD, Principal only (student sees their message when blocked). */
export const PORTAL_ACCESS_MANAGERS: Role[] = [...LEADERSHIP_ROLES];

/** Fee structure CRUD — leadership only. */
export const FEE_STRUCTURE_MANAGERS: Role[] = [...LEADERSHIP_ROLES];

/** Fee payment collection/status updates — leadership + cashier. */
export const FEE_PAYMENT_MANAGERS: Role[] = [...LEADERSHIP_ROLES, Role.ACCOUNTS];

/** Anyone who can manage courses, attendance, assignments, timetable (includes lecturers). */
export const COURSE_STAFF_ROLES: Role[] = [
  ...OFFICE_ROLES,
  Role.ASSISTANT_PROFESSOR,
  Role.PROFESSOR,
  Role.CLINICAL_STAFF,
  Role.GUEST_PROFESSOR,
];

/** Submit coursework (enrolled students + guest student accounts). */
export const ASSIGNMENT_SUBMIT_ROLES: Role[] = [Role.STUDENT, Role.GUEST_STUDENT];

/** View another user’s profile (directory / admin). */
export const USER_PROFILE_VIEWERS: Role[] = [
  ...LEADERSHIP_ROLES,
  Role.ASSISTANT_PROFESSOR,
  Role.PROFESSOR,
  Role.CLINICAL_STAFF,
  Role.GUEST_PROFESSOR,
];
