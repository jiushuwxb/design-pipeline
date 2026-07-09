// ============================================
// {{ProjectName}} — 全局类型定义
// 自动生成，按业务模块扩展
// ============================================

// ========== API 响应 ==========

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

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ========== 通用 Props ==========

export interface BaseComponentProps {
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

{{#each Models}}
export interface {{Name}} {
  id: string;
  createdAt: string;
  updatedAt: string;
  {{#each Fields}}
  {{name}}{{optional}}: {{type}};
  {{/each}}
}
{{/each}}
