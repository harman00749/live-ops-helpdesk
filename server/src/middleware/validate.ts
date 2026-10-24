import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app-error.js";

function validationError(issues: unknown): AppError {
  return new AppError(400, "VALIDATION_ERROR", "Request validation failed.", issues);
}

export function validateBody(schema: ZodType): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);
    if (!result.success) return next(validationError(result.error.flatten()));
    request.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.query);
    if (!result.success) return next(validationError(result.error.flatten()));
    Object.defineProperty(request, "query", { value: result.data, configurable: true });
    next();
  };
}
