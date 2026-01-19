<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { onMounted } from 'vue'

const $q = useQuasar()

onMounted(() => {
  // Initialize dark mode from localStorage or system preference
  const savedTheme = localStorage.getItem('lepton-theme')
  if (savedTheme) {
    $q.dark.set(savedTheme === 'dark')
  } else {
    $q.dark.set('auto')
  }
})
</script>

<style lang="scss">
@import './css/app.scss';
</style>
