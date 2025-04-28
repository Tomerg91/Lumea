import morgan from 'morgan';
import { Request, Response } from 'express';
import { createLogger, format, transports } from 'winston';

// Create a Winston logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'lumea-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Create a custom token for request body
morgan.token('body', (req: Request) => JSON.stringify(req.body));

// Create a custom token for response body
morgan.token('response-body', (req: Request, res: Response) => {
  const responseBody = (res as any).responseBody;
  return responseBody ? JSON.stringify(responseBody) : '';
});

// Create the logging middleware
export const loggingMiddleware = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body :response-body',
  {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }
);

// Export the logger for use in other parts of the application
export { logger }; 