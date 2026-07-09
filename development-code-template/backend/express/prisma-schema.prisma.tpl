// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========== 用户 ==========
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  role      String   @default("viewer")  // admin | operator | viewer
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ========== 服务器 ==========
model Server {
  id        String   @id @default(cuid())
  hostname  String
  ip        String
  status    String   @default("online")  // online | offline | maintenance
  cpuCores  Int      @default(4)
  memoryGB  Float    @default(16)
  diskGB    Float    @default(256)
  cpuUsage  Float?
  memUsage  Float?
  diskUsage Float?
  cluster   String?
  groupTags String[] @default([])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ========== 告警 ==========
model Alert {
  id          String    @id @default(cuid())
  title       String
  description String?
  severity    String    @default("info")    // critical | warning | info
  status      String    @default("active")  // active | acknowledged | resolved | closed
  source      String?
  count       Int       @default(1)
  assignedTo  String?
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// ========== 告警规则 ==========
model AlertRule {
  id            String   @id @default(cuid())
  name          String
  description   String?
  metric        String
  operator      String   // gt | lt | gte | lte | eq
  threshold     Float
  severity      String   @default("warning")
  enabled       Boolean  @default(true)
  notifyChannel String?  // email | sms | webhook
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ========== 工单 ==========
model Ticket {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("open")     // open | assigned | in_progress | pending_verify | resolved | closed
  priority    String    @default("medium")   // low | medium | high | urgent
  assignee    String?
  alertId     String?
  serverId    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  comments    Comment[]
}

// ========== 工单评论 ==========
model Comment {
  id        String   @id @default(cuid())
  content   String
  author    String
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
