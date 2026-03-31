import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { env } from "./env.config.js";
import { logger } from "./logger.config.js";

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
});

export const prisma = new PrismaClient({
  adapter,
  log: [
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

prisma.$on("error", (e) => logger.error("Prisma error", { error: e.message }));
prisma.$on("warn", (e) => logger.warn("Prisma warning", { warning: e.message }));
