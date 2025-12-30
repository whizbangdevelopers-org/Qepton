<template>
  <q-dialog
    :model-value="uiStore.modals.logout"
    @update:model-value="handleClose"
    persistent
    data-test="logout-dialog"
  >
    <q-card style="min-width: 320px">
      <q-card-section class="row items-center">
        <q-avatar icon="logout" color="warning" text-color="white" />
        <span class="q-ml-sm text-h6">Log Out</span>
      </q-card-section>

      <q-card-section>
        <p>Are you sure you want to log out?</p>
        <p class="text-caption text-grey">
          You will need to enter your GitHub token again to access your gists.
        </p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="Cancel"
          @click="handleClose"
          data-test="cancel-logout"
        />
        <q-btn
          color="warning"
          label="Log Out"
          @click="handleLogout"
          data-test="confirm-logout"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUIStore } from 'src/stores/ui'
import { useAuthStore } from 'src/stores/auth'
import { useGistsStore } from 'src/stores/gists'

const router = useRouter()
const uiStore = useUIStore()
const authStore = useAuthStore()
const gistsStore = useGistsStore()

function handleClose() {
  uiStore.closeModal('logout')
}

function handleLogout() {
  authStore.logout()
  uiStore.reset()
  gistsStore.$reset()
  handleClose()
  router.push('/login')
}
</script>
