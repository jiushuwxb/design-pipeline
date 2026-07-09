import type { FastifyRequest, FastifyReply } from 'fastify';

export const {{ModuleName}}Controller = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { page = '1', pageSize = '20' } = req.query as Record<string, string>;
    reply.send({ code: 200, data: { items: [], total: 0, page: Number(page), pageSize: Number(pageSize) }, message: 'ok' });
  },

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    reply.send({ code: 200, data: { id }, message: 'ok' });
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    reply.status(201).send({ code: 201, data: req.body, message: '创建成功' });
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    reply.send({ code: 200, data: { id, ...req.body as object }, message: '更新成功' });
  },

  async delete(req: FastifyRequest, reply: FastifyReply) {
    reply.send({ code: 200, data: null, message: '删除成功' });
  },
};
