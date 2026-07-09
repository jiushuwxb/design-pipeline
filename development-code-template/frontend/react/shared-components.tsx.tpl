// ============================================
// {{ProjectName}} — 共享组件
// Loading / Empty / Error 三态组件
// ============================================

interface SharedProps {
  message?: string;
  onRetry?: () => void;
}

// ---------- Loading ----------

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-3" role="status" aria-label="加载中">
      <div className="h-4 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-700 rounded w-1/2" />
      <div className="h-4 bg-slate-700 rounded w-2/3" />
      <span className="sr-only">加载中...</span>
    </div>
  );
}

// ---------- Empty ----------

export function EmptyState({ message = '暂无数据' }: SharedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500" role="status">
      <svg className="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---------- Error ----------

export function ErrorState({ message = '加载失败', onRetry }: SharedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16" role="alert">
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl font-bold">!</span>
      </div>
      <p className="text-red-400 text-sm font-medium mb-1">{message}</p>
      <p className="text-slate-600 text-xs mb-4">请检查网络连接后重试</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          重新加载
        </button>
      )}
    </div>
  );
}

// ---------- StatusBadge ----------

type StatusType = 'online' | 'offline' | 'warning' | 'error' | 'processing';

const statusMap: Record<StatusType, { bg: string; text: string; dot: string }> = {
  online:     { bg: 'bg-emerald-500/10',   text: 'text-emerald-400',   dot: 'bg-emerald-400' },
  offline:    { bg: 'bg-slate-500/10',      text: 'text-slate-400',     dot: 'bg-slate-400' },
  warning:    { bg: 'bg-amber-500/10',      text: 'text-amber-400',     dot: 'bg-amber-400' },
  error:      { bg: 'bg-red-500/10',        text: 'text-red-400',       dot: 'bg-red-400' },
  processing: { bg: 'bg-cyan-500/10',       text: 'text-cyan-400',      dot: 'bg-cyan-400 animate-pulse' },
};

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const style = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label || status}
    </span>
  );
}
