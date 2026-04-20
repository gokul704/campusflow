import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES } from "../../middleware/roleGroups";
import { getAccessSettingsHandler, putAccessSettingsHandler } from "./tenant.controller";

const router = Router();
router.use(authenticate);
router.get("/access-settings", authorize(...LEADERSHIP_ROLES), getAccessSettingsHandler);
router.put("/access-settings", authorize(...LEADERSHIP_ROLES), putAccessSettingsHandler);

export default router;
