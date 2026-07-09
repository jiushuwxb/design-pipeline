import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {{#each Pages}}
  {
    path: '{{Route}}',
    name: '{{PageName}}',
    component: () => import('../pages/{{PageName}}/index.vue'),
    meta: { title: '{{PageName}}' },
  },
  {{/each}}
  {
    path: '/',
    redirect: '{{DefaultRoute}}',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} — {{ProjectName}}`;
  }
});

export default router;
