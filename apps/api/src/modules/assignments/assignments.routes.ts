import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
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
router.post("/", authorize("ADMIN", "FACULTY"), createHandler);
router.put("/:id", authorize("ADMIN", "FACULTY"), updateHandler);
router.delete("/:id", authorize("ADMIN", "FACULTY"), deleteHandler);
router.post("/:id/submit", authorize("STUDENT"), submitHandler);
router.post("/:id/grade", authorize("ADMIN", "FACULTY"), gradeHandler);
export default router;
