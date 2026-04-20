import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireModuleAction } from "../../lib/tenantAccessMatrix";
import { searchHandler } from "./search.controller";

const router = Router();
router.use(authenticate, requireModuleAction("dashboard", "view"));
router.get("/", searchHandler);

export default router;
