import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-[400px]" role="alert">
          <div className="text-center p-8 bg-slate-800/50 rounded-xl border border-slate-700 max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <p className="text-red-400 text-lg font-semibold mb-2">组件加载异常</p>
            <p className="text-slate-500 text-sm mb-2">{this.state.error?.message}</p>
            <details className="text-xs text-slate-600 mb-4">
              <summary className="cursor-pointer">技术详情</summary>
              <pre className="mt-2 text-left whitespace-pre-wrap">{this.state.errorInfo}</pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
