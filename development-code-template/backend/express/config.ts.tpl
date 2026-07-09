import dotenv from 'dotenv';
import { resolve } from 'path';

// 加载 .env
dotenv.config({ path: resolve(__dirname, '../.env') });

export const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/{{projectName}}',

  // JWT 过期时间
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
