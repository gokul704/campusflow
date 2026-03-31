import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
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
router.post("/", authorize("ADMIN"), createHandler);
router.put("/:id/read", markReadHandler);
router.put("/mark-all-read", markAllReadHandler);
export default router;
