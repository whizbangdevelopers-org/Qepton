import { RouteRecordRaw } from 'vue-router'

// Extend route meta type
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

// Check if running in demo mode (build-time)
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

// Use demo login page in demo mode, regular login otherwise
const loginComponent = isDemoMode
  ? () => import('pages/DemoLoginPage.vue')
  : () => import('pages/LoginPage.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }]
  },

  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [{ path: '', component: loginComponent }]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
