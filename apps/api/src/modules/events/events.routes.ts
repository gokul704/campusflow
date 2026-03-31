import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listHandler, createHandler, updateHandler, deleteHandler } from "./events.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/", authorize("ADMIN"), createHandler);
router.put("/:id", authorize("ADMIN"), updateHandler);
router.delete("/:id", authorize("ADMIN"), deleteHandler);
export default router;
