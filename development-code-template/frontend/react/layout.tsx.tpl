import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { Header } from '../components/shared/Header';
import { Sidebar } from '../components/shared/Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
