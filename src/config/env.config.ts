import { z } from "zod/v4";
import "dotenv/config";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default("api"),

  // Database
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string({ error: "DB_USER is required" }),
  DB_PASSWORD: z.string({ error: "DB_PASSWORD is required" }),
  DB_NAME: z.string({ error: "DB_NAME is required" }),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // Razorpay
  RAZORPAY_KEY_ID: z.string({ error: "RAZORPAY_KEY_ID is required" }),
  RAZORPAY_KEY_SECRET: z.string({ error: "RAZORPAY_KEY_SECRET is required" }),
  RAZORPAY_WEBHOOK_SECRET: z.string({ error: "RAZORPAY_WEBHOOK_SECRET is required" }),

  // Redis
  REDIS_HOST: z.string({ error: "REDIS_HOST is required" }),
  REDIS_PORT: z.coerce.number({ error: "REDIS_PORT is required" }),
  REDIS_PASSWORD: z.string({ error: "REDIS_PASSWORD is required" }),
  REDIS_DB: z.coerce.number({ error: "REDIS_DB is required" }),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

// Construct DATABASE_URL for Prisma
export const DATABASE_URL = `mysql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

// Set it on process.env so Prisma can read it
process.env.DATABASE_URL = DATABASE_URL;
