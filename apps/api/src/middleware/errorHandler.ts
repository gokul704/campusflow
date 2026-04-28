import { Request, Response, NextFunction } from "express";

type PayloadTooLargeError = Error & {
  type?: string;
  status?: number;
  statusCode?: number;
};

export function errorHandler(
  err: PayloadTooLargeError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[${req.method}] ${req.path}`, err);

  if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
    res.status(413).json({ error: "File size too large. Please upload a smaller file." });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { message: err.message }),
  });
}
