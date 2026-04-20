import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import { listHandler, createHandler, bulkCreateHandler, updateHandler, deleteHandler } from "./events.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.post("/bulk", authorize(...OFFICE_ROLES), bulkCreateHandler);
router.post("/", authorize(...OFFICE_ROLES), createHandler);
router.put("/:id", authorize(...OFFICE_ROLES), updateHandler);
router.delete("/:id", authorize(...OFFICE_ROLES), deleteHandler);
export default router;
