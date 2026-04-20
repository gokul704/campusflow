import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
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
router.post("/structures", authorize(...OFFICE_ROLES), requireModuleAction("fees", "create"), createStructureHandler);
router.put("/structures/:id", authorize(...OFFICE_ROLES), requireModuleAction("fees", "edit"), updateStructureHandler);
router.delete("/structures/:id", authorize(...OFFICE_ROLES), requireModuleAction("fees", "delete"), deleteStructureHandler);
router.get("/payments", requireModuleAction("fees", "view"), listPaymentsHandler);
router.post("/payments", authorize(...OFFICE_ROLES), requireModuleAction("fees", "create"), createPaymentHandler);
router.put("/payments/:id/status", authorize(...OFFICE_ROLES), requireModuleAction("fees", "edit"), updatePaymentStatusHandler);
export default router;
