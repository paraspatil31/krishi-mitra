import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

// 404 handler - catches any route that didn't match
export function notFound(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
}

// Central error handler - keep this LAST in the middleware chain in app.ts.
// Every route should call next(err) on failure instead of sending its own
// error response, so error formatting stays consistent across the API.
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error(err.stack);

  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Something went wrong on our end"
      : err.message;

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier format";
  }

  if ((err as any).type === "entity.too.large" || (err as any).status === 413) {
    statusCode = 413;
    message = "Uploaded image or payload is too large. Maximum allowed size is 15MB.";
  }

  res.status(statusCode).json({ error: message });
}
