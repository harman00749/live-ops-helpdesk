import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { allowedOrigins } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { ticketRouter } from "./routes/ticket.routes.js";
import { AppError } from "./utils/app-error.js";
import { sendSuccess } from "./utils/responses.js";

const origins = allowedOrigins();

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed by CORS."));
  },
  credentials: true,
}));
app.use(express.json({ limit: "200kb" }));
app.use(requestLogger);
app.use("/api", rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/", (_request, response) => sendSuccess(response, {
  service: "Live Ops Helpdesk API",
  version: "1.0.0",
  realtime: "Socket.IO enabled",
  health: "/api/health",
  tickets: "/api/tickets",
}));

app.get("/api/health", (_request, response) => sendSuccess(response, {
  service: "live-ops-helpdesk-api",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  timestamp: new Date().toISOString(),
}));

app.use("/api/tickets", ticketRouter);
app.use(notFoundHandler);
app.use(errorHandler);
