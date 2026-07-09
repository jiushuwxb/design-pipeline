import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { serverConfig } from '../config';

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
}

/**
 * JWT 认证中间件
 * 从 Authorization header 提取 Bearer token 并验证
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 401,
      data: null,
      message: '未登录或 Token 缺失',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, serverConfig.jwtSecret) as JwtPayload;
    (req as Request & { user: JwtPayload }).user = decoded;
    next();
  } catch {
    res.status(401).json({
      code: 401,
      data: null,
      message: 'Token 无效或已过期',
    });
  }
}

/**
 * 角色权限中间件工厂
 * @param roles 允许的角色列表
 */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user: JwtPayload }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        code: 403,
        data: null,
        message: '权限不足',
      });
      return;
    }
    next();
  };
}
