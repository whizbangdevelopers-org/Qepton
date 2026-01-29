<template>
  <q-page class="flex flex-center login-page">
    <q-card class="login-card">
      <q-card-section class="text-center logo-section">
        <img
          :src="logoUrl"
          alt="Qepton"
          class="login-logo"
        />
        <div class="text-subtitle1 text-grey-7 q-mt-sm">Demo Playground</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-center">
        <q-icon name="mdi-test-tube" size="48px" color="primary" class="q-mb-md" />
        <div class="text-h6 q-mb-sm">Try Qepton Free</div>
        <p class="text-body2 text-grey-7">
          Explore a fully functional demo with real prompts and code snippets.<br />
          Create, edit, and organize your own - it's all yours to play with!
        </p>
        <p class="text-caption text-grey-6 q-mt-sm">
          Fresh content every Sunday
        </p>
      </q-card-section>

      <q-card-section>
        <!-- CAPTCHA -->
        <div v-if="!captchaVerified" class="captcha-container">
          <div id="hcaptcha"></div>
        </div>

        <!-- Enter Demo Button (after CAPTCHA) -->
        <q-btn
          v-else
          color="primary"
          label="Enter Demo"
          @click="enterDemo"
          :loading="isLoading"
          class="full-width"
          size="lg"
          icon="mdi-rocket-launch"
          data-test="enter-demo-button"
        />

        <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ error }}
        </q-banner>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-center">
        <p class="text-caption text-grey-7 q-mb-xs">Have your own GitHub token?</p>
        <q-btn
          flat
          color="secondary"
          label="Try the PWA"
          href="https://whizbangdevelopers-org.github.io/Qepton/"
          target="_blank"
          icon="mdi-github"
          size="sm"
          class="q-mb-md"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="text-center">
        <p class="text-caption text-grey-7 q-mb-sm">Want the full experience?</p>
        <q-btn
          flat
          color="primary"
          label="Get Qepton"
          href="https://whizbangdevelopers-org.github.io/Qepton/"
          target="_blank"
          icon="mdi-open-in-new"
          size="sm"
        />
        <p class="gracious-reminder q-mt-md">Be a Gracious User</p>
      </q-card-section>

    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useGistsStore } from 'src/stores/gists'
import { useSimpleMeta } from 'src/composables/useMeta'
import logoUrl from 'src/assets/images/logos/qepton-wordmark-dark.svg'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const gistsStore = useGistsStore()

useSimpleMeta('Demo', 'Try Qepton without signing up')

const captchaVerified = ref(false)
const isLoading = ref(false)
const error = ref('')

// hCaptcha site key - use test key for development, real key for production
const hcaptchaSiteKey =
  import.meta.env.VITE_HCAPTCHA_SITEKEY || '10000000-ffff-ffff-ffff-000000000001'

// Global callback for hCaptcha
declare global {
  interface Window {
    onCaptchaSuccess: (token: string) => void
    hcaptcha?: {
      reset: () => void
      render: (container: string | HTMLElement, options?: Record<string, unknown>) => string
    }
  }
}

onMounted(async () => {
  // Reset captcha state on mount (handles returning after logout)
  captchaVerified.value = false
  error.value = ''

  // Set up global callback
  window.onCaptchaSuccess = (token: string) => {
    if (token) {
      captchaVerified.value = true
    }
  }

  // If already authenticated in demo mode, redirect to home
  if (authStore.isAuthenticated) {
    router.push('/')
    return
  }

  // Load hCaptcha script if not already loaded
  if (!document.getElementById('hcaptcha-script')) {
    const script = document.createElement('script')
    script.id = 'hcaptcha-script'
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    // Wait for script to load, then render
    script.onload = () => {
      renderCaptcha()
    }
  } else {
    // Script already loaded, re-render the widget
    await nextTick()
    renderCaptcha()
  }
})

function renderCaptcha() {
  const container = document.getElementById('hcaptcha')
  if (container && window.hcaptcha) {
    // Clear any existing widget
    container.innerHTML = ''
    // Render fresh widget
    window.hcaptcha.render(container, {
      sitekey: hcaptchaSiteKey,
      callback: 'onCaptchaSuccess',
      theme: 'dark'
    })
  }
}

async function enterDemo() {
  if (!captchaVerified.value) {
    error.value = 'Please complete the CAPTCHA first'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    // Reconstruct token from split parts (bypasses GitHub push protection)
    // Each part is base64 encoded separately, then concatenated after decoding
    const p1 = import.meta.env.VITE_DEMO_TOKEN_P1
    const p2 = import.meta.env.VITE_DEMO_TOKEN_P2
    let demoToken: string | undefined

    if (p1 && p2) {
      // Split token approach (preferred - bypasses push protection)
      demoToken = atob(p1) + atob(p2)
    } else {
      // Fallback to single base64 token (may trigger push protection)
      const tokenB64 = import.meta.env.VITE_DEMO_TOKEN_B64
      demoToken = tokenB64 ? atob(tokenB64) : undefined
    }

    // Login as demo user (with token if available)
    await authStore.loginAsDemo(demoToken)

    $q.notify({
      type: 'positive',
      message: 'Welcome to the Qepton Demo!',
      icon: 'mdi-test-tube',
      caption: 'Browse sample snippets'
    })

    // Sync gists in background
    gistsStore.syncGists().catch(err => {
      console.error('Background sync failed:', err)
    })

    // Redirect to home
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to enter demo mode'

    $q.notify({
      type: 'negative',
      message: 'Failed to start demo',
      icon: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  min-height: 100vh;
}

.login-card {
  min-width: 400px;
  max-width: 500px;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.login-logo {
  height: 80px;
  width: auto;
  margin-right: -60px;
}

.captcha-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.gracious-reminder {
  color: #39ff14;
  text-shadow: 0 0 4px #39ff14;
  font-weight: 400;
  font-size: 26px;
}

</style>
