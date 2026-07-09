# {{ProjectName}} 后端 API

## 技术栈

| 技术 | 版本 |
|------|------|
| Runtime | Node.js 22+ |
| Framework | Express 4 |
| Language | TypeScript 5.7 |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制模板并修改）
cp .env.example .env

# 3. 初始化数据库
npm run db:migrate

# 4. 启动开发服务器
npm run dev
# → http://localhost:3001
```

## 健康检查

```
GET http://localhost:3001/api/health
```

## API 路由

{{#each Modules}}
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/{{Route}} | 列表查询 |
| GET    | /api/{{Route}}/:id | 详情 |
| POST   | /api/{{Route}} | 创建 |
| PUT    | /api/{{Route}}/:id | 更新 |
| DELETE | /api/{{Route}}/:id | 删除 |
{{/each}}

## 统一响应格式

```json
{
  "code": 200,
  "data": {},
  "message": "ok"
}
```

## 目录结构

```
src/
├── config/          # 环境配置
├── controllers/     # 请求处理
├── middleware/       # 中间件（auth / errorHandler）
├── routes/          # 路由定义
├── types/           # 类型定义
├── utils/           # 工具函数
└── index.ts         # 服务入口
prisma/
└── schema.prisma    # 数据库 Schema
```
