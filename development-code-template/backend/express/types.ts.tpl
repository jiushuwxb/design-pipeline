// ============================================
// {{ProjectName}} API — 类型定义
// ============================================

// ========== 统一响应格式 ==========

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== 用户认证 ==========

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
}
