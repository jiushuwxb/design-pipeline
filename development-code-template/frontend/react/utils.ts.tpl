// ============================================
// {{ProjectName}} — 通用工具函数
// ============================================

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '--';
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * 格式化大数字（千分位）
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('zh-CN').format(value);
}

/**
 * 格式化耗时
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return Math.round(ms) + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  if (ms < 3600000) return (ms / 60000).toFixed(1) + 'min';
  return (ms / 3600000).toFixed(1) + 'h';
}

/**
 * 格式化时间
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 拼接 className
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 获取严重度颜色
 */
export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: '#ef4444',
    major: '#f59e0b',
    minor: '#06b6d4',
    info: '#94a3b8',
  };
  return map[severity] || '#94a3b8';
}

/**
 * 防抖
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 截断字符串
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
