import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listBatchesHandler, createBatchHandler, updateBatchHandler, deleteBatchHandler } from "./batches.controller";

const router = Router();
router.use(authenticate);
router.get("/", listBatchesHandler);
router.post("/", authorize("ADMIN"), createBatchHandler);
router.put("/:id", authorize("ADMIN"), updateBatchHandler);
router.delete("/:id", authorize("ADMIN"), deleteBatchHandler);
export default router;
