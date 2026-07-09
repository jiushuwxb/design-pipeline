import type { Request, Response } from 'express';

/**
 * {{ModuleName}} CRUD 控制器
 */
export const {{ModuleName}}Controller = {
  // ---------- List ----------
  async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      // TODO: 替换为实际数据库查询
      // const [items, total] = await Promise.all([
      //   prisma.{{moduleName}}.findMany({ skip: (page - 1) * pageSize, take: pageSize }),
      //   prisma.{{moduleName}}.count(),
      // ]);

      res.json({
        code: 200,
        data: { items: [], total: 0, page, pageSize },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({
        code: 500,
        data: null,
        message: (err as Error).message,
      });
    }
  },

  // ---------- Get by ID ----------
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // TODO: const item = await prisma.{{moduleName}}.findUnique({ where: { id } });
      // if (!item) { res.status(404).json(...); return; }

      res.json({ code: 200, data: { id }, message: 'ok' });
    } catch (err) {
      res.status(500).json({
        code: 500,
        data: null,
        message: (err as Error).message,
      });
    }
  },

  // ---------- Create ----------
  async create(req: Request, res: Response) {
    try {
      // TODO: const item = await prisma.{{moduleName}}.create({ data: req.body });
      res.status(201).json({
        code: 201,
        data: req.body,
        message: '创建成功',
      });
    } catch (err) {
      const message = (err as Error).message;
      const code = message.includes('violates') ? 400 : 500;
      res.status(code).json({ code, data: null, message });
    }
  },

  // ---------- Update ----------
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // TODO: const item = await prisma.{{moduleName}}.update({ where: { id }, data: req.body });

      res.json({ code: 200, data: { id }, message: '更新成功' });
    } catch (err) {
      const message = (err as Error).message;
      const code = message.includes('not found') ? 404 : 500;
      res.status(code).json({ code, data: null, message });
    }
  },

  // ---------- Delete ----------
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // TODO: await prisma.{{moduleName}}.delete({ where: { id } });

      res.json({ code: 200, data: null, message: '删除成功' });
    } catch (err) {
      const message = (err as Error).message;
      const code = message.includes('not found') ? 404 : 500;
      res.status(code).json({ code, data: null, message });
    }
  },
};
