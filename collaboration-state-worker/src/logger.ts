export class Logger {
  constructor(private readonly scope: string) {}

  private format(level: string, message: string, details?: unknown): string {
    const prefix = `[${new Date().toISOString()}] [${level}] [${this.scope}] ${message}`;
    if (details === undefined) return prefix;
    return `${prefix} ${typeof details === "string" ? details : JSON.stringify(details)}`;
  }

  info(message: string, details?: unknown): void {
    console.log(this.format("INFO", message, details));
  }

  warn(message: string, details?: unknown): void {
    console.warn(this.format("WARN", message, details));
  }

  error(message: string, details?: unknown): void {
    console.error(this.format("ERROR", message, details));
  }

  debug(message: string, details?: unknown): void {
    if (process.env.LOG_LEVEL === "debug") {
      console.debug(this.format("DEBUG", message, details));
    }
  }
}
