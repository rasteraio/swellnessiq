import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists' },
    });
    return;
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'],
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
