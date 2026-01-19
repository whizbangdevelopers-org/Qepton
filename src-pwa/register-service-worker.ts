/**
 * PWA Service Worker Registration
 * Handles service worker lifecycle events and offline support
 */

import { register } from 'register-service-worker'
import { Notify } from 'quasar'

// The ready(), registered(), cached(), updatefound() and updated()
// events pass a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

register(process.env.SERVICE_WORKER_FILE || '', {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(/* registration */) {
    console.log('[PWA] Service worker is active.')
  },

  registered(/* registration */) {
    console.log('[PWA] Service worker has been registered.')
  },

  cached(/* registration */) {
    console.log('[PWA] Content has been cached for offline use.')
    Notify.create({
      message: 'App ready for offline use',
      icon: 'cloud_done',
      color: 'positive',
      position: 'bottom',
      timeout: 3000
    })
  },

  updatefound(/* registration */) {
    console.log('[PWA] New content is downloading.')
  },

  updated(registration) {
    console.log('[PWA] New content is available; please refresh.')
    Notify.create({
      message: 'New version available. Click to update.',
      icon: 'system_update',
      color: 'primary',
      position: 'bottom',
      timeout: 0,
      actions: [
        {
          label: 'Update',
          color: 'white',
          handler: () => {
            // Skip waiting and reload
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
            window.location.reload()
          }
        },
        {
          label: 'Dismiss',
          color: 'white',
          handler: () => {
            /* dismiss */
          }
        }
      ]
    })
  },

  offline() {
    console.log('[PWA] No internet connection found. App is running in offline mode.')
    Notify.create({
      message: 'You are offline. Some features may be limited.',
      icon: 'cloud_off',
      color: 'warning',
      position: 'bottom',
      timeout: 5000
    })
  },

  error(err) {
    console.error('[PWA] Error during service worker registration:', err)
  }
})
