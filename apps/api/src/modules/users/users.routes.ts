import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { LEADERSHIP_ROLES, OFFICE_ROLES, USER_PROFILE_VIEWERS } from "../../middleware/roleGroups";
import {
  createDirectUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deactivateUserHandler,
  activateUserHandler,
} from "./users.controller";

const router = Router();

router.use(authenticate);
router.post("/", authorize(...LEADERSHIP_ROLES), createDirectUserHandler);
router.get("/", authorize(...OFFICE_ROLES), listUsersHandler);
router.get("/:id", authorize(...USER_PROFILE_VIEWERS), getUserHandler);
router.put("/:id", authorize(...LEADERSHIP_ROLES), updateUserHandler);
router.patch("/:id/deactivate", authorize(...LEADERSHIP_ROLES), deactivateUserHandler);
router.patch("/:id/activate", authorize(...LEADERSHIP_ROLES), activateUserHandler);

export default router;
