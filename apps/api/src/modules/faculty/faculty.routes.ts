import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import {
  listFacultyHandler,
  getFacultyHandler,
  createFacultyHandler,
  bulkCreateFacultyHandler,
  updateFacultyHandler,
} from "./faculty.controller";

const router = Router();
router.use(authenticate);
router.get("/", listFacultyHandler);
router.post("/bulk", authorize(...OFFICE_ROLES), bulkCreateFacultyHandler);
router.get("/:id", getFacultyHandler);
router.post("/", authorize(...OFFICE_ROLES), createFacultyHandler);
router.put("/:id", authorize(...OFFICE_ROLES), updateFacultyHandler);
export default router;
