import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { getEnv } from "../config/env.js";

export const requestLogger: RequestHandler = (request, response, next) => {
  const requestId = request.header("x-request-id") ?? randomUUID();
  response.setHeader("x-request-id", requestId);
  if (getEnv().LOG_HTTP_REQUESTS) {
    const startedAt = Date.now();
    response.on("finish", () => {
      process.stdout.write(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms requestId=${requestId}\n`);
    });
  }
  next();
};
