<template>
  <q-page class="flex flex-center login-page">
    <q-card class="login-card">
      <q-card-section class="text-center logo-section">
        <img
          :src="logoUrl"
          alt="Qepton"
          class="login-logo"
        />
        <div class="text-subtitle1 text-grey-7 q-mt-sm">Prompt and Code Snippet Manager</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-input
          v-model="token"
          label="GitHub Personal Access Token"
          type="password"
          outlined
          :rules="[val => !!val || 'Token is required']"
          hint="Paste your GitHub token with 'gist' scope"
          @keyup.enter="loginWithToken"
          data-test="token-input"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-key" />
          </template>
        </q-input>

        <q-btn
          color="primary"
          label="Login"
          @click="loginWithToken"
          :loading="isLoading"
          :disable="!token"
          class="full-width q-mt-md"
          data-test="login-button"
        />

        <!-- Import from gh CLI (Electron only) -->
        <q-btn
          v-if="isElectron"
          color="secondary"
          label="Import from gh CLI"
          icon="mdi-github"
          @click="importFromGhCli"
          :loading="isImporting"
          class="full-width q-mt-sm"
          outline
          data-test="gh-import-button"
        />

        <div class="text-center q-mt-md">
          <a
            href="https://github.com/settings/tokens/new?scopes=gist&description=Qepton"
            target="_blank"
            class="text-caption"
          >
            <q-icon name="mdi-open-in-new" size="xs" />
            Generate a new token
          </a>
        </div>

        <q-banner v-if="error" class="bg-negative text-white q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="error" />
          </template>
          {{ error }}
        </q-banner>
      </q-card-section>

      <q-card-section class="text-center text-caption text-grey-7">
        <p>Need help?</p>
        <p>Token must have <strong>gist</strong> scope to read and write gists</p>

        <q-expansion-item
          dense
          dense-toggle
          label="NixOS / CLI users"
          header-class="text-caption text-grey-6"
          class="q-mt-sm"
        >
          <div class="q-pa-sm text-left">
            <p>If you use <code>gh</code> CLI with keyring-based auth:</p>
            <code class="text-primary">gh auth token | wl-copy</code>
            <p class="q-mt-xs">Then paste the token above.</p>
            <p v-if="isElectron" class="text-grey-6">
              Or click "Import from gh CLI" to auto-import.
            </p>
          </div>
        </q-expansion-item>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useSimpleMeta } from 'src/composables/useMeta'
import logoUrl from 'src/assets/images/logos/qepton-wordmark-dark.svg'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

// Set page title
useSimpleMeta('Login', 'Login to access your GitHub Gists')

const token = ref('')
const isLoading = ref(false)
const isImporting = ref(false)
const error = ref('')

// Check if running in Electron
const isElectron = computed(() => !!window.electronAPI)

async function loginWithToken() {
  if (!token.value.trim()) {
    error.value = 'Please enter a token'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    // Login with token
    await authStore.loginWithToken(token.value.trim())

    // Success notification
    $q.notify({
      type: 'positive',
      message: `Welcome, ${authStore.username}!`,
      icon: 'check_circle'
    })

    // Redirect to home first, then sync gists
    // (IndexPage.onMounted will handle the sync)
    await router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Invalid GitHub token'

    $q.notify({
      type: 'negative',
      message: 'Login failed. Please check your token.',
      icon: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

async function importFromGhCli() {
  if (!window.electronAPI) return

  isImporting.value = true
  error.value = ''

  try {
    const result = await window.electronAPI.getGhToken()

    if (result.success && result.token) {
      token.value = result.token
      $q.notify({
        type: 'positive',
        message: 'Token imported from gh CLI',
        icon: 'check_circle'
      })
    } else {
      error.value = result.error || 'Could not retrieve token from gh CLI'
      $q.notify({
        type: 'warning',
        message: 'gh CLI token not found. Is gh installed and authenticated?',
        icon: 'warning'
      })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to import token'
    $q.notify({
      type: 'negative',
      message: 'Failed to import from gh CLI',
      icon: 'error'
    })
  } finally {
    isImporting.value = false
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
  margin-right: -60px; // Compensate for SVG right padding
}

a {
  text-decoration: none;
  color: var(--q-primary);

  &:hover {
    text-decoration: underline;
  }
}
</style>
