import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { ASSIGNMENT_SUBMIT_ROLES, COURSE_STAFF_ROLES } from "../../middleware/roleGroups";
import {
  listHandler,
  myListHandler,
  getOneHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  submitHandler,
  verifyHandler,
  gradeHandler,
  downloadSubmissionFileHandler,
  downloadHandoutFileHandler,
} from "./assignments.controller";

const router = Router();
router.use(authenticate);

router.get("/my", authorize(...ASSIGNMENT_SUBMIT_ROLES), myListHandler);
router.get("/submission-file/:submissionId", downloadSubmissionFileHandler);
router.get("/handout-file/:assignmentId", downloadHandoutFileHandler);

router.get("/", listHandler);
router.get("/:id", getOneHandler);
router.post("/", authorize(...COURSE_STAFF_ROLES), createHandler);
router.put("/:id", authorize(...COURSE_STAFF_ROLES), updateHandler);
router.delete("/:id", authorize(...COURSE_STAFF_ROLES), deleteHandler);
router.post("/:id/submit", authorize(...ASSIGNMENT_SUBMIT_ROLES), submitHandler);
router.post("/:id/verify", authorize(...COURSE_STAFF_ROLES), verifyHandler);
router.post("/:id/grade", authorize(...COURSE_STAFF_ROLES), gradeHandler);
export default router;
