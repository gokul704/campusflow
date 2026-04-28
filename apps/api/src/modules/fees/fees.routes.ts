import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { FEE_PAYMENT_MANAGERS, FEE_STRUCTURE_MANAGERS } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
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
router.get("/structures", requireModuleAction("fees", "view"), listStructuresHandler);
router.post("/structures", authorize(...FEE_STRUCTURE_MANAGERS), requireModuleAction("fees", "create"), createStructureHandler);
router.put("/structures/:id", authorize(...FEE_STRUCTURE_MANAGERS), requireModuleAction("fees", "edit"), updateStructureHandler);
router.delete("/structures/:id", authorize(...FEE_STRUCTURE_MANAGERS), requireModuleAction("fees", "delete"), deleteStructureHandler);
router.get("/payments", requireModuleAction("fees", "view"), listPaymentsHandler);
router.post("/payments", authorize(...FEE_PAYMENT_MANAGERS), requireModuleAction("fees", "create"), createPaymentHandler);
router.put("/payments/:id/status", authorize(...FEE_PAYMENT_MANAGERS), requireModuleAction("fees", "edit"), updatePaymentStatusHandler);
export default router;
