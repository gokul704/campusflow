import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listHandler, upsertHandler, deleteHandler } from "./exam-grades.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/", authorize("ADMIN", "FACULTY"), upsertHandler);
router.delete("/:id", authorize("ADMIN", "FACULTY"), deleteHandler);
export default router;
