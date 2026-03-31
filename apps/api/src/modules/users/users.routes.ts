import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import {
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deactivateUserHandler,
  activateUserHandler,
} from "./users.controller";
import {
  sendInviteHandler,
  getInviteInfoHandler,
  acceptInviteHandler,
} from "./invite.controller";

const router = Router();

// Public invite routes (no auth needed)
router.get("/invite/:token", getInviteInfoHandler);
router.post("/invite/accept", acceptInviteHandler);

// Protected routes
router.use(authenticate);
router.post("/invite", authorize("ADMIN"), sendInviteHandler);
router.get("/", authorize("ADMIN"), listUsersHandler);
router.get("/:id", authorize("ADMIN", "FACULTY"), getUserHandler);
router.put("/:id", authorize("ADMIN"), updateUserHandler);
router.patch("/:id/deactivate", authorize("ADMIN"), deactivateUserHandler);
router.patch("/:id/activate", authorize("ADMIN"), activateUserHandler);

export default router;
