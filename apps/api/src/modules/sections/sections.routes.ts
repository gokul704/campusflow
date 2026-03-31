import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listSectionsHandler, createSectionHandler, deleteSectionHandler } from "./sections.controller";

const router = Router();
router.use(authenticate);
router.get("/", listSectionsHandler);
router.post("/", authorize("ADMIN"), createSectionHandler);
router.delete("/:id", authorize("ADMIN"), deleteSectionHandler);
export default router;
