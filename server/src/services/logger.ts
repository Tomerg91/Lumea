interface LogData {
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  data?: Record<string, any>;
  error?: Error;
}

class LoggerService {
  private static instance: LoggerService;

  private constructor() {
    // Initialize your logging service here (e.g., Sentry, Winston, etc.)
    // For Sentry:
    // if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    //   Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 });
    // }
    console.log('LoggerService initialized.');
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public log({ message, level = 'info', data, error }: LogData): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}`;

    // In production, send to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureMessage(message, { level, extra: data });
      // if (error) Sentry.captureException(error, { extra: data });
      console.log(`[PROD_LOG_PLACEHOLDER] ${logEntry}`, data || '', error || ''); // Placeholder
    } else {
      // Development logging
      if (error) {
        (console as any)[level](logEntry, data || '', error);
      } else {
        (console as any)[level](logEntry, data || '');
      }
    }
  }

  public info(message: string, data?: Record<string, any>): void {
    this.log({ message, level: 'info', data });
  }

  public warn(message: string, data?: Record<string, any>): void {
    this.log({ message, level: 'warn', data });
  }

  public error(message: string, error?: Error, data?: Record<string, any>): void {
    this.log({ message, level: 'error', data, error });
  }

  public debug(message: string, data?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log({ message, level: 'debug', data });
    }
  }
}

export const logger = LoggerService.getInstance();
