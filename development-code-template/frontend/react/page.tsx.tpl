import { type FC, lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { PageShell } from '../layouts/PageShell';

{{#each Components}}
const {{ComponentName}} = lazy(() => import('../components/{{PageName}}/{{ComponentName}}'));
{{/each}}

/**
 * {{Description}}
 * Route: {{Route}}
 */
export const {{PageName}}Page: FC = () => {
  return (
    <PageShell title="{{PageName}}" description="{{Description}}">
      <ErrorBoundary>
        <div className="grid grid-cols-12 gap-4">
          {{#each Components}}
          <Suspense fallback={<LoadingSkeleton />}>
            <{{ComponentName}} />
          </Suspense>
          {{/each}}
        </div>
      </ErrorBoundary>
    </PageShell>
  );
};

export default {{PageName}}Page;
