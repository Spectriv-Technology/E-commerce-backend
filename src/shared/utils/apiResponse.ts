import { Response } from "express";

interface ApiResponseOptions {
  statusCode: number;
  message: string;
  data?: unknown;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const apiResponse = (res: Response, options: ApiResponseOptions) => {
  const { statusCode, message, data, meta } = options;

  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
};
