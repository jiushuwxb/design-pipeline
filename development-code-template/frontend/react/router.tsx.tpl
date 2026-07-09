import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';

{{#each Pages}}
const {{PageName}} = lazy(() => import('../pages/{{PageName}}'));
{{/each}}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {{#each Pages}}
          <Route
            path="{{Route}}"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <{{PageName}} />
              </Suspense>
            }
          />
          {{/each}}
          <Route path="/" element={<Navigate to="{{DefaultRoute}}" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
      <p className="text-6xl font-bold text-slate-600 mb-4">404</p>
      <p className="text-lg mb-2">页面不存在</p>
      <a href="/" className="text-cyan-400 hover:text-cyan-300 underline text-sm">返回首页</a>
    </div>
  );
}
