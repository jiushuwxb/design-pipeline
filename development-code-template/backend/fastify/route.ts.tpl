import type { FastifyInstance } from 'fastify';
import { {{ModuleName}}Controller } from '../controllers/{{ModuleName}}';

export async function {{ModuleName}}Routes(app: FastifyInstance) {
  app.get('/', {{ModuleName}}Controller.list);
  app.get('/:id', {{ModuleName}}Controller.getById);
  app.post('/', {{ModuleName}}Controller.create);
  app.put('/:id', {{ModuleName}}Controller.update);
  app.delete('/:id', {{ModuleName}}Controller.delete);
}
