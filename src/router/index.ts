import { route } from 'quasar/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'

import routes from './routes'
import { useAuthStore } from 'src/stores/auth'

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // Authentication guard
  Router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      console.debug('[Router] Redirecting to login - authentication required')
      next('/login')
      return
    }

    // Redirect authenticated users away from login page
    if (to.path === '/login' && authStore.isAuthenticated) {
      console.debug('[Router] Redirecting to home - already authenticated')
      next('/')
      return
    }

    // Allow navigation
    next()
  })

  return Router
})
