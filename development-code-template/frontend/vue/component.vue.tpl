<template>
  <div class="bg-slate-800 rounded-lg border border-slate-700 p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        {{ComponentName}}
      </h3>
      <button
        @click="emit('refresh')"
        class="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="刷新数据"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <LoadingSkeleton v-if="isLoading" />

    <!-- Error -->
    <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />

    <!-- Empty -->
    <EmptyState v-else-if="!hasData" />

    <!-- Content -->
    <div v-else class="space-y-2">
      <!-- TODO: 实现 {{ComponentName}} 的核心渲染逻辑 -->
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LoadingSkeleton, ErrorState, EmptyState } from '../shared';

interface Props {
  data?: unknown[];
  isLoading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
});

const emit = defineEmits<{
  refresh: [];
  retry: [];
  action: [id: string];
}>();

const hasData = computed(() => props.data && props.data.length > 0);
</script>
