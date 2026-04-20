import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import {
  listBatchesHandler,
  createBatchHandler,
  bulkCreateBatchesHandler,
  updateBatchHandler,
  deleteBatchHandler,
} from "./batches.controller";

const router = Router();
router.use(authenticate);
router.get("/", listBatchesHandler);
router.post("/bulk", authorize(...OFFICE_ROLES), bulkCreateBatchesHandler);
router.post("/", authorize(...OFFICE_ROLES), createBatchHandler);
router.put("/:id", authorize(...OFFICE_ROLES), updateBatchHandler);
router.delete("/:id", authorize(...OFFICE_ROLES), deleteBatchHandler);
export default router;
