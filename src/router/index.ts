import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../views/DashboardPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardPage,
    },
    {
      path: '/season',
      name: 'Season',
      component: () => import('../views/SeasonPage.vue'),
    },
  ],
});

export default router;