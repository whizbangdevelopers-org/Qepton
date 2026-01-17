/**
 * App Initialization Boot File
 * Initializes theme and restores auth session on app startup
 */

import { boot } from 'quasar/wrappers'
import { themeService } from 'src/services/theme'
import { useAuthStore } from 'src/stores/auth'

export default boot(async () => {
  console.debug('[Boot] Initializing app...')

  // Initialize theme service
  themeService.initialize()

  // Try to restore auth session from localStorage
  const authStore = useAuthStore()

  try {
    const restored = await authStore.restoreSession()

    if (restored) {
      console.debug('[Boot] Auth session restored')
    } else {
      console.debug('[Boot] No saved session found')
    }
  } catch (error) {
    console.warn('[Boot] Session restoration failed:', error)
  }

  console.debug('[Boot] App initialization complete')
})
