<template>
  <q-dialog
    :model-value="uiStore.modals.about"
    @update:model-value="handleClose"
    data-test="about-dialog"
  >
    <q-card class="about-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">About Qepton</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section class="text-center q-pt-md">
        <q-avatar size="80px" color="primary" text-color="white" icon="code" />
        <div class="text-h5 q-mt-md">Qepton</div>
        <div class="text-subtitle1 text-grey">Prompt and Code Snippet Manager</div>
        <div class="text-caption text-grey q-mt-xs">Powered by GitHub Gist</div>
      </q-card-section>

      <q-card-section>
        <q-list>
          <q-item>
            <q-item-section avatar>
              <q-icon name="info" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Version</q-item-label>
              <q-item-label>{{ appVersion }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="build" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Built with</q-item-label>
              <q-item-label>Quasar Framework + Vue 3</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable @click="openLink('https://github.com')">
            <q-item-section avatar>
              <q-icon name="mdi-github" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Source Code</q-item-label>
              <q-item-label>View on GitHub</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="open_in_new" size="xs" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-center text-caption text-grey">
        <div>Qepton = Quasar + Lepton</div>
        <div class="q-mt-xs">A modern rewrite of the original Lepton project</div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useUIStore } from 'src/stores/ui'

const uiStore = useUIStore()

// eslint-disable-next-line no-undef
const appVersion = __APP_VERSION__ || '1.0.0'

function handleClose() {
  uiStore.closeModal('about')
}

function openLink(url: string) {
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.about-dialog {
  min-width: 320px;
  max-width: 400px;
}
</style>
