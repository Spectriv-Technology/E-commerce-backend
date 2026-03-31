import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod/v4";
import { HttpStatus } from "../shared/constants/httpStatus.js";

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    for (const [key, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse((req as Record<string, unknown>)[key]);
      if (!result.success) {
        errors[key] = result.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
      } else {
        // Express 5 makes req.query a read-only getter, so override it
        Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errorCode: "VAL_001",
        errors,
      });
    }

    next();
  };
};
