import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { serverConfig } from './config';
import { errorHandler } from './middleware/errorHandler';

{{#each Modules}}
import {{ModuleName}}Router from './routes/{{ModuleName}}';
{{/each}}

const app = express();

// ========== 全局中间件 ==========
app.use(helmet());
app.use(cors({ origin: serverConfig.corsOrigin, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ========== 健康检查 ==========
app.get('/api/health', (_req, res) => {
  res.json({
    code: 200,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: 'ok',
  });
});

// ========== 业务路由 ==========
{{#each Modules}}
app.use('/api/{{Route}}', {{ModuleName}}Router);
{{/each}}

// ========== 错误处理 ==========
app.use(errorHandler);

// ========== 启动 ==========
app.listen(serverConfig.port, serverConfig.host, () => {
  console.log(`
  🚀 {{ProjectName}} API Server
  ────────────────────────────
  Address:  http://${serverConfig.host}:${serverConfig.port}
  Health:   http://${serverConfig.host}:${serverConfig.port}/api/health
  Env:      ${process.env.NODE_ENV || 'development'}
  `);
});

export default app;
