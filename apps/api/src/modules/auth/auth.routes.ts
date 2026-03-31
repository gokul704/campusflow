import { Router } from "express";
import {
  loginHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
} from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";
import { authLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post("/login", authLimiter, loginHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/reset-password", authLimiter, resetPasswordHandler);
router.get("/me", authenticate, meHandler);
router.post("/change-password", authenticate, changePasswordHandler);

export default router;
