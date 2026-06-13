export interface AppConfig {
  port: number;
  redisUrl: string;
  springbootBaseUrl: string;
  springbootBearerToken: string;
  workerBearerToken: string;
  persistIntervalMs: number;
  textFieldName: string;
}

function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value == null || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNumber(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable ${name}: ${value}`);
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    port: parseNumber(requiredEnv("PORT", "3000"), "PORT"),
    redisUrl: requiredEnv("REDIS_URL"),
    springbootBaseUrl: requiredEnv("SPRINGBOOT_BASE_URL"),
    springbootBearerToken: requiredEnv("SPRINGBOOT_BEARER_TOKEN"),
    workerBearerToken: requiredEnv("WORKER_BEARER_TOKEN"),
    persistIntervalMs: parseNumber(requiredEnv("PERSIST_INTERVAL_MS", "30000"), "PERSIST_INTERVAL_MS"),
    textFieldName: requiredEnv("DOC_TEXT_FIELD_NAME", "markdown"),
  };
}
// for the purposes of sanity:
// SPRINGBOOT_BEARER_TOKEN -> token required by worker to make requests to springboot
// WORKER_BEARER_TOKEN -> token required by springboot to make requests to worker