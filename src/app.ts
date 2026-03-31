import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import { requestId } from "./middlewares/requestId.middleware.js";
import { requestLogger } from "./middlewares/requestLogger.middleware.js";
import { rateLimiter } from "./middlewares/rateLimiter.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { corsOptions } from "./config/cors.config.js";
import routes from "./routes.js";
import swaggerDocument from "./swagger.json";

const app = express();

// --- Static files (before helmet so CSP doesn't block Razorpay Checkout) ---
app.use(express.static("public"));

// --- Swagger UI (before helmet so CSP doesn't block it) ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Security ---
app.use(helmet());
app.use(cors(corsOptions));

// --- Parsing ---
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as Express.Request).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// --- Request tracking & logging ---
app.use(requestId);
app.use(requestLogger);

// --- Rate limiting ---
app.use(rateLimiter);

// --- API Routes ---
app.use("/api/v1", routes);

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --- Global Error Handler (MUST be last) ---
app.use(errorHandler);

export default app;
