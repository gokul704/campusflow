import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import {
  getAttendanceHandler,
  bulkMarkAttendanceHandler,
  getAttendanceSummaryHandler,
  deleteHandler,
} from "./attendance.controller";

const router = Router();
router.use(authenticate);
router.get("/", getAttendanceHandler);
router.get("/summary/:batchCourseId", getAttendanceSummaryHandler);
router.post("/", authorize("ADMIN", "FACULTY"), bulkMarkAttendanceHandler);
router.delete("/:id", authorize("ADMIN", "FACULTY"), deleteHandler);
export default router;
