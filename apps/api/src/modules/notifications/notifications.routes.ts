import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import {
  listHandler,
  unreadCountHandler,
  createHandler,
  markReadHandler,
  markAllReadHandler,
} from "./notifications.controller";

const router = Router();
router.use(authenticate);
router.get("/", listHandler);
router.get("/unread-count", unreadCountHandler);
router.post("/", authorize(...OFFICE_ROLES), createHandler);
/** Static path must be registered before `/:id` or Express treats "mark-all-read" as an id. */
router.put("/mark-all-read", markAllReadHandler);
router.put("/:id/read", markReadHandler);
export default router;
