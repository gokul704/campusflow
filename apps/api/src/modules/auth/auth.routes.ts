import { Router } from "express";
import {
  loginHandler,
  meHandler,
  patchProfileHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  permissionsHandler,
} from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";
import { authLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post("/login", authLimiter, loginHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/reset-password", authLimiter, resetPasswordHandler);
router.get("/me", authenticate, meHandler);
router.get("/permissions", authenticate, permissionsHandler);
router.patch("/profile", authenticate, patchProfileHandler);
router.post("/change-password", authenticate, changePasswordHandler);

export default router;
