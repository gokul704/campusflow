import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import {
  listDepartmentsHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
} from "./departments.controller";

const router = Router();

router.use(authenticate);

router.get("/", listDepartmentsHandler);
router.post("/", authorize("ADMIN"), createDepartmentHandler);
router.put("/:id", authorize("ADMIN"), updateDepartmentHandler);
router.delete("/:id", authorize("ADMIN"), deleteDepartmentHandler);

export default router;
