import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { HttpStatus } from "../shared/constants/httpStatus.js";
import { ErrorCode } from "../shared/constants/errorCodes.js";

interface JwtPayload {
  id: string;
  phone: string;
  role: "admin" | "customer";
  type: string;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Access token is required",
      errorCode: ErrorCode.AUTH_TOKEN_INVALID,
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (decoded.type !== "access") {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Invalid token type",
        errorCode: ErrorCode.AUTH_TOKEN_INVALID,
      });
    }

    req.auth = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      type: decoded.type,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Access token has expired",
        errorCode: ErrorCode.AUTH_TOKEN_EXPIRED,
      });
    }

    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Invalid access token",
      errorCode: ErrorCode.AUTH_TOKEN_INVALID,
    });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, () => {
    if (req.auth?.role !== "admin") {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: "Admin access required",
        errorCode: ErrorCode.AUTH_INSUFFICIENT_PERMISSION,
      });
    }
    next();
  });
};

export const requireCustomer = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, () => {
    if (req.auth?.role !== "customer") {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: "Customer access required",
        errorCode: ErrorCode.AUTH_INSUFFICIENT_PERMISSION,
      });
    }
    next();
  });
};
