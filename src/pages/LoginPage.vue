<template>
  <q-page class="flex flex-center login-page">
    <q-card class="login-card">
      <q-card-section class="text-center">
        <q-icon name="mdi-code-braces" size="80px" color="primary" />
        <div class="text-h4 q-mt-md">Qepton</div>
        <div class="text-subtitle1 text-grey-7">Code Snippet Manager</div>
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
        <p>
          Token must have <strong>gist</strong> scope to read and write gists
        </p>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useGistsStore } from 'src/stores/gists'
import { useSimpleMeta } from 'src/composables/useMeta'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const gistsStore = useGistsStore()

// Set page title
useSimpleMeta('Login', 'Login to access your GitHub Gists')

const token = ref('')
const isLoading = ref(false)
const error = ref('')

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

    // Sync gists and starred gists in background
    Promise.all([
      gistsStore.syncGists(),
      gistsStore.syncStarredGists()
    ]).catch(err => {
      console.error('Background sync failed:', err)
    })

    // Redirect to home
    router.push('/')
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
</script>

<style lang="scss" scoped>
.login-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.login-card {
  min-width: 400px;
  max-width: 500px;
}

a {
  text-decoration: none;
  color: var(--q-primary);

  &:hover {
    text-decoration: underline;
  }
}
</style>
