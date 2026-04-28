import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import {
  attendanceReportHandler,
  attendanceCourseWiseReportHandler,
  attendanceStudentWiseReportHandler,
  attendanceBatchWiseReportHandler,
  attendanceSemesterWiseReportHandler,
  gradeReportHandler,
  feeReportHandler,
  exportCsvReportHandler,
  timetableConflictsHandler,
} from "./reports.controller";

const router = Router();
router.use(authenticate);
router.get("/export", requireModuleAction("reports", "view"), exportCsvReportHandler);
router.get("/timetable/conflicts", requireModuleAction("reports", "view"), timetableConflictsHandler);
router.get("/attendance/course-wise", requireModuleAction("reports", "view"), attendanceCourseWiseReportHandler);
router.get("/attendance/student-wise", requireModuleAction("reports", "view"), attendanceStudentWiseReportHandler);
router.get("/attendance/batch-wise", requireModuleAction("reports", "view"), attendanceBatchWiseReportHandler);
router.get("/attendance/semester-wise", requireModuleAction("reports", "view"), attendanceSemesterWiseReportHandler);
router.get("/attendance/:batchCourseId", requireModuleAction("reports", "view"), attendanceReportHandler);
router.get("/grades/:batchCourseId", requireModuleAction("reports", "view"), gradeReportHandler);
router.get("/fees", authorize(...LEADERSHIP_ROLES), requireModuleAction("reports", "view"), feeReportHandler);
export default router;
