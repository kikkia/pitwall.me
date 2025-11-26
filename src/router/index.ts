import { createRouter, createWebHistory } from 'vue-router';
import { useHead } from '@unhead/vue';
import DashboardPage from '../views/DashboardPage.vue';
import HomePage from '../views/HomePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
      meta: {
        title: 'Pitwall.me - Your F1 Dashboard',
        description: 'Take a seat on the F1 pitwall and create your own race engineer dashboards to view real-time or past session telemetry data. Monitor driver performance, lap times, and more.',
      },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardPage,
      meta: {
        title: 'F1 Telemetry Dashboard - Pitwall.me',
        description: 'Create and customize your own F1 telemetry dashboard with real-time data. Monitor driver performance, lap times, and more.',
      },
    },
    {
      path: '/schedule',
      name: 'Schedule',
      component: () => import('../views/SchedulePage.vue'),
      meta: {
        title: 'F1 Race Schedule - Pitwall.me',
        description: 'Up to date race schedule, including dates, times, and locations for every F1 session.',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
      meta: {
        title: 'Page Not Found - Pitwall.me',
        description: 'The page you are looking for does not exist.',
      },
    },
  ],
});

router.afterEach((to) => {
  useHead({
    title: to.meta.title as string,
    meta: [
      {
        name: 'description',
        content: to.meta.description as string,
      },
    ],
  });
});

export default router;