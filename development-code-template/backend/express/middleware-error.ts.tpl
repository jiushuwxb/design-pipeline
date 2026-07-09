import type { Request, Response, NextFunction } from 'express';

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    code: 500,
    data: null,
    message: process.env.NODE_ENV === 'production'
      ? '服务器内部错误，请稍后重试'
      : err.message,
  });
}
