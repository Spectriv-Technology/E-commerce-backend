import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./config/logger.config.js";
import { prisma } from "./config/database.config.js";
import { redis } from "./config/redis.config.js";

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    await redis.ping();
    logger.info("Redis connected");

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

startServer();
