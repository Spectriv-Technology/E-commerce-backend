import { env } from "./env.config.js";

export const corsOptions = {
  origin: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  credentials: true,
};
