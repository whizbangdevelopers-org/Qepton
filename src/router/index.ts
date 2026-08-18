import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'

import routes from './routes'
import { useAuthStore } from 'src/stores/auth'

export default defineRouter(function (/* { store, ssrContext } */) {
    // `import.meta.env.QUASAR_*`, not `process.env.*`. app-vite 2 exposed these as `process.env`;
  // v3 renamed them AND moved them onto import.meta.env (verified against the installed package:
  // quasar-config-file.js defines import.meta.env.QUASAR_VUE_ROUTER_MODE / _BASE, and
  // modes/ssr/ssr-config.js defines QUASAR_SERVER).
  //
  // The v2 form does not fail loudly, which is why it survived the upgrade in four repos at once.
  // In the BUILD, Vite statically replaces `process.env.X` with undefined, so the ternaries fall
  // through to `createWebHashHistory(undefined)` — which happens to equal the configured
  // `vueRouterMode: 'hash'` and `publicPath: '/'`, so production is correct BY COINCIDENCE. In the
  // DEV server nothing defines `process` at all, so this module throws
  // `ReferenceError: process is not defined` at import time, the app never mounts, and every UI
  // spec times out against a blank page while API specs pass.
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
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
