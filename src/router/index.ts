import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../views/DashboardPage.vue';
import HomePage from '../views/HomePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardPage,
    },
    {
      path: '/schedule',
      name: 'Schedule',
      component: () => import('../views/SchedulePage.vue'),
    },
  ],
});

export default router;