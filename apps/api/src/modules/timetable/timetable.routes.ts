import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listHandler, createHandler, updateHandler, deleteHandler } from "./timetable.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/", authorize("ADMIN", "FACULTY"), createHandler);
router.put("/:id", authorize("ADMIN", "FACULTY"), updateHandler);
router.delete("/:id", authorize("ADMIN", "FACULTY"), deleteHandler);
export default router;
