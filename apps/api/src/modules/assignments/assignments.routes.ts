import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { ASSIGNMENT_SUBMIT_ROLES, COURSE_STAFF_ROLES } from "../../middleware/roleGroups";
import {
  listHandler,
  getOneHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  submitHandler,
  gradeHandler,
} from "./assignments.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.get("/:id", getOneHandler);
router.post("/", authorize(...COURSE_STAFF_ROLES), createHandler);
router.put("/:id", authorize(...COURSE_STAFF_ROLES), updateHandler);
router.delete("/:id", authorize(...COURSE_STAFF_ROLES), deleteHandler);
router.post("/:id/submit", authorize(...ASSIGNMENT_SUBMIT_ROLES), submitHandler);
router.post("/:id/grade", authorize(...COURSE_STAFF_ROLES), gradeHandler);
export default router;
