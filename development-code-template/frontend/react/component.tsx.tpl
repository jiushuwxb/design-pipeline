import { type FC, useState } from 'react';
import type { {{ComponentName}}Props } from '../types';
import { ErrorState, EmptyState, LoadingSkeleton } from '../shared';

/**
 * {{Description}}
 */
export const {{ComponentName}}: FC<{{ComponentName}}Props> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
  onAction,
}) => {
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {{ComponentName}}
        </h3>
        <button
          onClick={onRetry}
          className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="刷新数据"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Component content — 开发者在此填充业务逻辑 */}
      <div className="space-y-2">
        {/* TODO: 实现 {{ComponentName}} 的核心渲染逻辑 */}
      </div>
    </div>
  );
};

export default {{ComponentName}};

// ========== 子组件 ==========

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
