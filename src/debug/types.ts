export interface Logger {
  info(message: string, meta?: Record<string, string>): void;
  warn(message: string, meta?: Record<string, string>): void;
  error(message: string, meta?: Record<string, string>): void;
}
