import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, _next) => {
  const { statusCode = 500, code = 'INTERNAL_ERROR', message, stack } = err;

  logger.error(message, {
    code,
    statusCode,
    stack,
    path: req.path,
    method: req.method,
    userId: req.userId || req.user?.id,
    body: req.body ? { ...req.body, password: undefined } : undefined,
    query: req.query
  });

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      error: '输入验证失败',
      code: 'VALIDATION_ERROR',
      details: err.errors || err.message
    });
  }

  if (err.code === '23505') {
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

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });
  res.status(404).json({
    error: '资源不存在',
    code: 'NOT_FOUND'
  });
};