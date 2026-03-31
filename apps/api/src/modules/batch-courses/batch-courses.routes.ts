import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { listHandler, createHandler, updateHandler, deleteHandler } from "./batch-courses.controller";

const router = Router();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(authenticate);
router.get("/", asyncHandler(listHandler));
router.post("/", authorize("ADMIN"), asyncHandler(createHandler));
router.put("/:id", authorize("ADMIN", "FACULTY"), asyncHandler(updateHandler));
router.delete("/:id", authorize("ADMIN"), asyncHandler(deleteHandler));
export default router;
