import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { COURSE_STAFF_ROLES } from "../../middleware/roleGroups";
import { listHandler, upsertHandler, deleteHandler } from "./exam-grades.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/", authorize(...COURSE_STAFF_ROLES), upsertHandler);
router.delete("/:id", authorize(...COURSE_STAFF_ROLES), deleteHandler);
export default router;
