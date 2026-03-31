import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import {
  listStructuresHandler,
  createStructureHandler,
  updateStructureHandler,
  deleteStructureHandler,
  listPaymentsHandler,
  createPaymentHandler,
  updatePaymentStatusHandler,
} from "./fees.controller";

const router = Router();
router.use(authenticate);
router.get("/structures", listStructuresHandler);
router.post("/structures", authorize("ADMIN"), createStructureHandler);
router.put("/structures/:id", authorize("ADMIN"), updateStructureHandler);
router.delete("/structures/:id", authorize("ADMIN"), deleteStructureHandler);
router.get("/payments", listPaymentsHandler);
router.post("/payments", authorize("ADMIN"), createPaymentHandler);
router.put("/payments/:id/status", authorize("ADMIN"), updatePaymentStatusHandler);
export default router;
