<template>
  <q-page class="flex flex-center">
    <div class="text-center">
      <div style="font-size: 30vh">404</div>
      <div class="text-h2">Oops. Nothing here...</div>
      <q-btn
        class="q-mt-xl"
        color="primary"
        label="Go Home"
        @click="goHome"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>
