import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import {
  attendanceReportHandler,
  gradeReportHandler,
  feeReportHandler,
  exportCsvReportHandler,
  timetableConflictsHandler,
} from "./reports.controller";

const router = Router();
router.use(authenticate);
router.get("/export", requireModuleAction("reports", "view"), exportCsvReportHandler);
router.get("/timetable/conflicts", requireModuleAction("reports", "view"), timetableConflictsHandler);
router.get("/attendance/:batchCourseId", requireModuleAction("reports", "view"), attendanceReportHandler);
router.get("/grades/:batchCourseId", requireModuleAction("reports", "view"), gradeReportHandler);
router.get("/fees", authorize(...LEADERSHIP_ROLES), requireModuleAction("reports", "view"), feeReportHandler);
export default router;
