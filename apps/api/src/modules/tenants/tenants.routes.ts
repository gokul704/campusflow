import { Router } from "express";
import { createTenantHandler, listTenantsHandler } from "./tenants.controller";

const router = Router();

// Super-admin only — no tenantResolver middleware on these routes
router.post("/", createTenantHandler);
router.get("/", listTenantsHandler);

export default router;
