import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { serverConfig } from './config';

{{#each Modules}}
import { {{ModuleName}}Routes } from './routes/{{ModuleName}}';
{{/each}}

const app = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

async function bootstrap() {
  // Plugins
  await app.register(cors, { origin: serverConfig.corsOrigin, credentials: true });
  await app.register(helmet);

  // Health check
  app.get('/api/health', async () => ({
    code: 200,
    data: { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'ok',
  }));

  // Routes
  {{#each Modules}}
  await app.register({{ModuleName}}Routes, { prefix: '/api/{{Route}}' });
  {{/each}}

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      code: error.statusCode || 500,
      data: null,
      message: error.message,
    });
  });

  await app.listen({ port: serverConfig.port, host: serverConfig.host });
  console.log(`🚀 Server running at http://${serverConfig.host}:${serverConfig.port}`);
}

bootstrap();
