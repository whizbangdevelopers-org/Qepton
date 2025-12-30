<template>
  <q-dialog
    :model-value="uiStore.modals.settings"
    @update:model-value="handleClose"
    data-test="settings-dialog"
  >
    <q-card class="settings-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Settings</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-tabs v-model="activeTab" dense align="left" class="q-mt-sm">
        <q-tab name="languages" label="Languages" icon="code" />
        <q-tab name="editor" label="Editor" icon="edit" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="languages" class="q-pa-md">
          <div class="text-subtitle2 q-mb-sm">Supported Languages ({{ supportedLanguages.length }})</div>
          <div class="text-caption text-grey q-mb-md">
            Syntax highlighting is available for these file types
          </div>
          
          <q-list dense bordered separator class="rounded-borders">
            <q-item v-for="lang in supportedLanguages" :key="lang.id">
              <q-item-section avatar>
                <q-icon name="check_circle" color="positive" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ lang.name }}</q-item-label>
                <q-item-label caption>
                  {{ lang.extensions.map(e => `.${e}`).join(', ') }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="text-subtitle2 q-mt-lg q-mb-sm">Not Yet Supported ({{ unsupportedLanguages.length }})</div>
          <div class="text-caption text-grey q-mb-md">
            These languages can be added in future updates
          </div>
          
          <q-list dense bordered separator class="rounded-borders">
            <q-item v-for="lang in unsupportedLanguages" :key="lang.id">
              <q-item-section avatar>
                <q-icon name="schedule" color="grey" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ lang.name }}</q-item-label>
                <q-item-label caption>
                  {{ lang.extensions.map(e => `.${e}`).join(', ') }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>

        <q-tab-panel name="editor" class="q-pa-md">
          <div class="text-subtitle2 q-mb-md">Editor Preferences</div>
          
          <q-list>
            <q-item tag="label">
              <q-item-section>
                <q-item-label>Line Wrapping</q-item-label>
                <q-item-label caption>Wrap long lines in the editor</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle v-model="lineWrapping" color="primary" />
              </q-item-section>
            </q-item>

            <q-item tag="label">
              <q-item-section>
                <q-item-label>Tab Size</q-item-label>
                <q-item-label caption>Number of spaces per tab</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="tabSize"
                  dense
                  :options="[
                    { label: '2', value: 2 },
                    { label: '4', value: 4 }
                  ]"
                />
              </q-item-section>
            </q-item>

            <q-item tag="label">
              <q-item-section>
                <q-item-label>Font Size</q-item-label>
                <q-item-label caption>Editor font size in pixels</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="fontSize"
                  dense
                  :options="[
                    { label: '12', value: 12 },
                    { label: '14', value: 14 },
                    { label: '16', value: 16 }
                  ]"
                />
              </q-item-section>
            </q-item>

            <q-item tag="label">
              <q-item-section>
                <q-item-label>Preview Lines</q-item-label>
                <q-item-label caption>Lines shown in collapsed file preview</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="uiStore.previewLines"
                  dense
                  :options="[
                    { label: '0', value: 0 },
                    { label: '3', value: 3 },
                    { label: '5', value: 5 },
                    { label: '10', value: 10 },
                    { label: '15', value: 15 }
                  ]"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { SUPPORTED_LANGUAGES, UNSUPPORTED_LANGUAGES } from 'src/services/languages'

const uiStore = useUIStore()

const activeTab = ref('languages')
const lineWrapping = ref(true)
const tabSize = ref(2)
const fontSize = ref(14)

const supportedLanguages = SUPPORTED_LANGUAGES
const unsupportedLanguages = UNSUPPORTED_LANGUAGES

function handleClose() {
  uiStore.closeModal('settings')
}
</script>

<style lang="scss" scoped>
.settings-dialog {
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
}
</style>
