import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import bodyParser from 'koa-bodyparser';
import { serverConfig } from './config';

{{#each Modules}}
import { {{ModuleName}}Router } from './routes/{{ModuleName}}';
{{/each}}

const app = new Koa();

// Middleware
app.use(helmet());
app.use(cors({ origin: serverConfig.corsOrigin, credentials: true }));
app.use(bodyParser({ jsonLimit: '10mb' }));

// Error handling
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = (err as { status?: number }).status || 500;
    ctx.body = {
      code: ctx.status,
      data: null,
      message: (err as Error).message,
    };
    ctx.app.emit('error', err, ctx);
  }
});

// Health check
const healthRouter = new Router();
healthRouter.get('/api/health', (ctx) => {
  ctx.body = {
    code: 200,
    data: { status: 'healthy', uptime: process.uptime() },
    message: 'ok',
  };
});
app.use(healthRouter.routes());

// API routes
{{#each Modules}}
app.use({{ModuleName}}Router.routes());
app.use({{ModuleName}}Router.allowedMethods());
{{/each}}

app.listen(serverConfig.port, serverConfig.host, () => {
  console.log(`🚀 Server running at http://${serverConfig.host}:${serverConfig.port}`);
});
