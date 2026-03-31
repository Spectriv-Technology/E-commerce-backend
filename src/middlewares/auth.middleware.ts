import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { HttpStatus } from "../shared/constants/httpStatus.js";
import { ErrorCode } from "../shared/constants/errorCodes.js";

interface JwtPayload {
  userId: string;
  email: string;
  type: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
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
