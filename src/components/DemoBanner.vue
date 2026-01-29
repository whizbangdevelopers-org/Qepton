<template>
  <div v-if="isDemoMode" class="demo-banner">
    <q-icon name="mdi-test-tube" size="xs" />
    <span>Demo Mode</span>
    <span class="separator">|</span>
    <span class="demo-info gracious">Be a Gracious User</span>
    <span class="separator">|</span>
    <span class="demo-info">Refreshes Sundays</span>
    <q-btn
      flat
      dense
      size="sm"
      color="white"
      label="Get Full Version"
      href="https://whizbangdevelopers-org.github.io/Qepton/"
      target="_blank"
      class="q-ml-sm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Check if running in demo mode
const isDemoMode = computed(() => {
  // Check build-time flag OR localStorage flag
  return import.meta.env.VITE_DEMO_MODE === 'true' ||
         localStorage.getItem('qepton-demo-mode') === 'true'
})
</script>

<style lang="scss" scoped>
.demo-banner {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  color: white;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 20px;

  .separator {
    opacity: 0.5;
  }

  .demo-info {
    opacity: 0.9;
    font-weight: 400;

    &.gracious {
      color: #39ff14;
      text-shadow: 0 0 4px #39ff14;
      opacity: 1;
    }
  }
}
</style>
