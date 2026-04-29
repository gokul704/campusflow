import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import { listSectionsHandler, createSectionHandler, deleteSectionHandler } from "./sections.controller";

const router = Router();
router.use(authenticate);
router.get("/", requireModuleAction("batches", "view"), listSectionsHandler);
router.post("/", authorize(...OFFICE_ROLES), requireModuleAction("batches", "create"), createSectionHandler);
router.delete("/:id", authorize(...OFFICE_ROLES), requireModuleAction("batches", "delete"), deleteSectionHandler);
export default router;
