import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { attendanceReportHandler, gradeReportHandler, feeReportHandler } from "./reports.controller";

const router = Router();
router.use(authenticate);
router.get("/attendance/:batchCourseId", attendanceReportHandler);
router.get("/grades/:batchCourseId", gradeReportHandler);
router.get("/fees", authorize("ADMIN"), feeReportHandler);
export default router;
