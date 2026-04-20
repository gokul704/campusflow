import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import {
  listDepartmentsHandler,
  createDepartmentHandler,
  bulkCreateDepartmentsHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
} from "./departments.controller";

const router = Router();

router.use(authenticate);

router.get("/", listDepartmentsHandler);
router.post("/bulk", authorize(...OFFICE_ROLES), bulkCreateDepartmentsHandler);
router.post("/", authorize(...OFFICE_ROLES), createDepartmentHandler);
router.put("/:id", authorize(...OFFICE_ROLES), updateDepartmentHandler);
router.delete("/:id", authorize(...OFFICE_ROLES), deleteDepartmentHandler);

export default router;
