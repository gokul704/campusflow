import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import {
  listLibraryItemsHandler,
  listLibraryCategoriesHandler,
  createLibraryCategoryHandler,
  createLibraryItemHandler,
  downloadLibraryFileHandler,
  deleteLibraryItemHandler,
} from "./digital-library.controller";

const router = Router();
router.use(authenticate);

router.get("/", requireModuleAction("digitalLibrary", "view"), listLibraryItemsHandler);
router.get("/categories", requireModuleAction("digitalLibrary", "view"), listLibraryCategoriesHandler);
router.get("/:id/file", requireModuleAction("digitalLibrary", "view"), downloadLibraryFileHandler);
router.post(
  "/categories",
  authorize(...LEADERSHIP_ROLES),
  requireModuleAction("digitalLibrary", "create"),
  createLibraryCategoryHandler
);
router.post(
  "/",
  authorize(...LEADERSHIP_ROLES),
  requireModuleAction("digitalLibrary", "create"),
  createLibraryItemHandler
);
router.delete(
  "/:id",
  authorize(...LEADERSHIP_ROLES),
  requireModuleAction("digitalLibrary", "delete"),
  deleteLibraryItemHandler
);

export default router;
