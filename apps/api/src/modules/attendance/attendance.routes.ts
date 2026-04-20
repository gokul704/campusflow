import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { COURSE_STAFF_ROLES } from "../../middleware/roleGroups";
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
router.post("/bulk", authorize(...COURSE_STAFF_ROLES), bulkImportAttendanceHandler);
router.post("/", authorize(...COURSE_STAFF_ROLES), bulkMarkAttendanceHandler);
router.delete("/:id", authorize(...COURSE_STAFF_ROLES), deleteHandler);
export default router;
