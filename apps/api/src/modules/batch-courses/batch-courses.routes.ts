import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, authorize } from "../../middleware/authenticate";
import { OFFICE_ROLES } from "../../middleware/roleGroups";
import { listHandler, createHandler, bulkCreateHandler, updateHandler, deleteHandler } from "./batch-courses.controller";

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
router.post("/bulk", authorize(...OFFICE_ROLES), asyncHandler(bulkCreateHandler));
router.post("/", authorize(...OFFICE_ROLES), asyncHandler(createHandler));
router.put("/:id", authorize(...OFFICE_ROLES), asyncHandler(updateHandler));
router.delete("/:id", authorize(...OFFICE_ROLES), asyncHandler(deleteHandler));
export default router;
