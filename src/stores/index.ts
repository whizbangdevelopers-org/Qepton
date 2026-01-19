/**
 * Pinia Stores - Central Export
 * Import stores from this file for consistency
 */

import { store } from 'quasar/wrappers'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export { useAuthStore } from './auth'
export { useGistsStore } from './gists'
export { useUIStore } from './ui'
export { useSearchStore } from './search'

// Re-export types for convenience
export type {
  AuthState,
  GistsState,
  UIState,
  SearchState,
  ModalStates,
  TagInfo,
  UpdateInfo
} from 'src/types/store'

// Quasar requires a default export for the store feature
export default store((/* { ssrContext } */) => {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  return pinia
})
