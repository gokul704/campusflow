import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listStudentsHandler, getStudentHandler, createStudentHandler, updateStudentHandler } from "./students.controller";

const router = Router();
router.use(authenticate);
router.get("/", listStudentsHandler);
router.get("/:id", getStudentHandler);
router.post("/", authorize("ADMIN"), createStudentHandler);
router.put("/:id", authorize("ADMIN"), updateStudentHandler);
export default router;
