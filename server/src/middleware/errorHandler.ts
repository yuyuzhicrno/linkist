import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import type { User } from '../types/index';

interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

interface ValidationError extends Error {
  errors?: unknown[];
}

interface DatabaseError extends Error {
  code?: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const { statusCode = 500, code = 'INTERNAL_ERROR', message, stack } = err as Error & { statusCode?: number; code?: string };

  const authReq = req as AuthRequest;

  logger.error(message, {
    code,
    statusCode,
    stack,
    path: req.path,
    method: req.method,
    userId: authReq.userId || authReq.user?.id,
    body: req.body ? { ...req.body, password: undefined } : undefined,
    query: req.query
  });

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      error: '输入验证失败',
      code: 'VALIDATION_ERROR',
      details: (err as ValidationError).errors || err.message
    });
  }

  if ((err as DatabaseError).code === '23505') {
    return res.status(409).json({
      error: '资源已存在',
      code: 'DUPLICATE_ENTRY'
    });
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? '服务器内部错误' : message,
    code
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });
  res.status(404).json({
    error: '资源不存在',
    code: 'NOT_FOUND'
  });
};