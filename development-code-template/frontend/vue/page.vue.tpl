<template>
  <PageShell title="{{PageName}}" description="{{Description}}">
    <div class="grid grid-cols-12 gap-4">
      {{#each Components}}
      <Suspense>
        <{{ComponentName}} />
        <template #fallback>
          <LoadingSkeleton />
        </template>
      </Suspense>
      {{/each}}
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import PageShell from '../layouts/PageShell.vue';
import { LoadingSkeleton } from '../components/shared';

{{#each Components}}
const {{ComponentName}} = defineAsyncComponent(() => import('../components/{{PageName}}/{{ComponentName}}.vue'));
{{/each}}
</script>
