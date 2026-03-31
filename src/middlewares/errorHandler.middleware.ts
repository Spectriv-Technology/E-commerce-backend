import { Request, Response, NextFunction } from "express";
import { HttpError } from "../shared/utils/httpErrors.js";
import { logger } from "../config/logger.config.js";
import { Prisma } from "@prisma/client";
import { HttpStatus } from "../shared/constants/httpStatus.js";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Known operational errors
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: "Resource already exists",
        errorCode: "RES_002",
      });
    }
    if (err.code === "P2025") {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Resource not found",
        errorCode: "RES_001",
      });
    }
  }

  // Unexpected errors
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error",
    errorCode: "SRV_001",
  });
};
