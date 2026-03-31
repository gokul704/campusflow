import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listFacultyHandler, getFacultyHandler, createFacultyHandler, updateFacultyHandler } from "./faculty.controller";

const router = Router();
router.use(authenticate);
router.get("/", listFacultyHandler);
router.get("/:id", getFacultyHandler);
router.post("/", authorize("ADMIN"), createFacultyHandler);
router.put("/:id", authorize("ADMIN"), updateFacultyHandler);
export default router;
