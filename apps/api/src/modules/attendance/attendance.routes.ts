import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";
import {
  getAttendanceHandler,
  bulkMarkAttendanceHandler,
  bulkImportAttendanceHandler,
  getAttendanceSummaryHandler,
  deleteHandler,
} from "./attendance.controller";

const router = Router();
router.use(authenticate);
router.get("/", getAttendanceHandler);
router.get("/summary/:batchCourseId", getAttendanceSummaryHandler);
router.post("/bulk", authorize(...LEADERSHIP_ROLES), bulkImportAttendanceHandler);
router.post("/", authorize(...LEADERSHIP_ROLES), bulkMarkAttendanceHandler);
router.delete("/:id", authorize(...LEADERSHIP_ROLES), deleteHandler);
export default router;
