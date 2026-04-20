import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES, PORTAL_ACCESS_MANAGERS, STUDENT_CREATE_ROLES } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import {
  listStudentsHandler,
  getStudentHandler,
  createStudentHandler,
  bulkCreateStudentsHandler,
  updateStudentHandler,
  listRestrictedStudentsHandler,
  studentPortalAccessHandler,
} from "./students.controller";

const router = Router();
router.use(authenticate);
router.get("/restricted", authorize(...PORTAL_ACCESS_MANAGERS), listRestrictedStudentsHandler);
router.get("/", requireModuleAction("students", "view"), listStudentsHandler);
router.post(
  "/bulk",
  authorize(...STUDENT_CREATE_ROLES),
  requireModuleAction("students", "create"),
  bulkCreateStudentsHandler
);
router.post(
  "/",
  authorize(...STUDENT_CREATE_ROLES),
  requireModuleAction("students", "create"),
  createStudentHandler
);
router.get("/:id", requireModuleAction("students", "view"), getStudentHandler);
router.put("/:id", authorize(...OFFICE_ROLES), requireModuleAction("students", "edit"), updateStudentHandler);
router.post("/:id/portal-access", authorize(...PORTAL_ACCESS_MANAGERS), studentPortalAccessHandler);

export default router;
