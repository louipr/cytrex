// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.522Z
// ============================================================================

// Centralized logging service

import * as winston from 'winston';
import * as path from 'path';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'analyzer.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, { error: error?.stack, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  profile(id: string): void {
    this.logger.profile(id);
  }
}

