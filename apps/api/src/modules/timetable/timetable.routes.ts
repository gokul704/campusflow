import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { COURSE_STAFF_ROLES } from "../../middleware/roleGroups";
import { listHandler, createHandler, bulkCreateHandler, updateHandler, deleteHandler } from "./timetable.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/bulk", authorize(...COURSE_STAFF_ROLES), bulkCreateHandler);
router.post("/", authorize(...COURSE_STAFF_ROLES), createHandler);
router.put("/:id", authorize(...COURSE_STAFF_ROLES), updateHandler);
router.delete("/:id", authorize(...COURSE_STAFF_ROLES), deleteHandler);
export default router;
