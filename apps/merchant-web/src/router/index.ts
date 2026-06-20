import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import { merchantService } from '../services/merchant-service';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView },
    { path: '/dashboard', component: DashboardView }
  ]
});

router.beforeEach((to) => {
  if (to.path === '/login') {
    return true;
  }

  if (!merchantService.getAuthUser()) {
    return '/login';
  }

  return true;
});
