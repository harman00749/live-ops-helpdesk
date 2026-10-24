import { z } from "zod";

const booleanFromString = z.preprocess(
  (value) => typeof value === "string" ? value.toLowerCase() === "true" : value,
  z.boolean(),
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  SEED_DEMO_TICKETS: booleanFromString.default(true),
  LOG_HTTP_REQUESTS: booleanFromString.default(true),
});

export type Environment = z.infer<typeof schema>;
let cached: Environment | undefined;

export function getEnv(): Environment {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  cached = result.data;
  return cached;
}

export function allowedOrigins(): string[] {
  const configured = getEnv().CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  return getEnv().NODE_ENV === "development"
    ? [...new Set([...configured, "http://localhost:5173"])]
    : configured;
}
