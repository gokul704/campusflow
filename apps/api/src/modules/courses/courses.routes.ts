import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import {
  listCoursesHandler,
  createCourseHandler,
  bulkCreateCoursesHandler,
  updateCourseHandler,
  deleteCourseHandler,
} from "./courses.controller";

const router = Router();
router.use(authenticate);
router.get("/", listCoursesHandler);
router.post("/bulk", authorize(...OFFICE_ROLES), bulkCreateCoursesHandler);
router.post("/", authorize(...OFFICE_ROLES), createCourseHandler);
router.put("/:id", authorize(...OFFICE_ROLES), updateCourseHandler);
router.delete("/:id", authorize(...OFFICE_ROLES), deleteCourseHandler);
export default router;
