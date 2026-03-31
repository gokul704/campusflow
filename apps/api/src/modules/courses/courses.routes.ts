import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listCoursesHandler, createCourseHandler, updateCourseHandler, deleteCourseHandler } from "./courses.controller";

const router = Router();
router.use(authenticate);
router.get("/", listCoursesHandler);
router.post("/", authorize("ADMIN"), createCourseHandler);
router.put("/:id", authorize("ADMIN"), updateCourseHandler);
router.delete("/:id", authorize("ADMIN"), deleteCourseHandler);
export default router;
