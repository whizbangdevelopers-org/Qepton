<template>
  <q-dialog
    :model-value="uiStore.modals.help"
    @update:model-value="handleClose"
    data-test="help-dialog"
  >
    <q-card class="help-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Help</div>
        <q-space />
        <q-btn icon="close" flat round dense aria-label="Close" @click="handleClose" />
      </q-card-section>

      <q-card-section>
        <q-tabs v-model="activeTab" dense align="justify" narrow-indicator>
          <q-tab name="shortcuts" label="Shortcuts" />
          <q-tab name="features" label="Features" />
          <q-tab name="languages" label="Languages" />
          <q-tab name="tips" label="Tips" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated class="help-panels">
          <q-tab-panel name="shortcuts">
            <q-list dense>
              <q-item v-for="shortcut in shortcuts" :key="shortcut.keys">
                <q-item-section side>
                  <q-chip dense square size="sm" color="grey-8" text-color="white">
                    {{ shortcut.keys }}
                  </q-chip>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ shortcut.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="features">
            <q-list dense>
              <q-item v-for="feature in features" :key="feature.title">
                <q-item-section avatar>
                  <q-icon :name="feature.icon" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ feature.title }}</q-item-label>
                  <q-item-label caption>{{ feature.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="languages" class="q-pa-sm">
            <div class="text-caption text-grey q-mb-sm">
              {{ supportedLanguages.length }} supported languages with syntax highlighting
            </div>
            <div class="language-grid">
              <q-chip
                v-for="lang in supportedLanguages"
                :key="lang.id"
                dense
                size="sm"
                color="grey-8"
                text-color="white"
              >
                {{ lang.name }}
              </q-chip>
            </div>
          </q-tab-panel>

          <q-tab-panel name="tips">
            <q-list dense>
              <q-item v-for="(tip, index) in tips" :key="index">
                <q-item-section avatar>
                  <q-icon name="lightbulb" color="amber" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ tip }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { SUPPORTED_LANGUAGES } from 'src/services/languages'

const uiStore = useUIStore()
const activeTab = ref('shortcuts')
const supportedLanguages = SUPPORTED_LANGUAGES

const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
const cmdKey = isMac ? 'Cmd' : 'Ctrl'

const shortcuts = [
  { keys: `${cmdKey}+N`, description: 'Create new gist' },
  { keys: `${cmdKey}+E`, description: 'Edit active gist' },
  { keys: `${cmdKey}+R`, description: 'Sync gists' },
  { keys: `${cmdKey}+D`, description: 'Toggle dashboard' },
  { keys: `${cmdKey}+I`, description: 'Toggle immersive mode' },
  { keys: 'Shift+Space', description: 'Open search' },
  { keys: 'Escape', description: 'Close modals / Exit immersive mode' },
  { keys: 'j / k', description: 'Navigate list up/down' },
  { keys: 'Enter', description: 'Select focused item / Expand file' },
  { keys: 'Tab', description: 'Switch between gist list and preview' },
  { keys: `${cmdKey}+C`, description: 'Copy focused file content' }
]

const features = [
  {
    icon: 'mdi-github',
    title: 'GitHub Gist Integration',
    description: 'All snippets are stored in your GitHub Gists'
  },
  {
    icon: 'tag',
    title: 'Smart Tagging',
    description: 'Add #tags in descriptions for organization'
  },
  {
    icon: 'code',
    title: 'Language Detection',
    description: 'Automatic language tagging based on file extensions'
  },
  {
    icon: 'search',
    title: 'Fuzzy Search',
    description: 'Quickly find gists by name, content, or tags'
  },
  {
    icon: 'star',
    title: 'Starred Gists',
    description: 'Bookmark gists on GitHub (synced across devices)'
  },
  {
    icon: 'push_pin',
    title: 'Pinned Gists',
    description: 'Quick access to frequently used gists (local only)'
  },
  {
    icon: 'history',
    title: 'Version History',
    description: 'View and restore previous versions of gists'
  }
]

const tips = [
  'Use #tag-name in gist descriptions to add custom tags',
  'Pin frequently used tags for quick access',
  'Double-click a file to expand/collapse its content',
  'Use immersive mode for distraction-free viewing',
  'Star gists to save them on GitHub (syncs across devices), pin gists for quick local access'
]

function handleClose() {
  uiStore.closeModal('help')
}
</script>

<style lang="scss" scoped>
.help-dialog {
  min-width: 400px;
  max-width: 500px;
}

.help-panels {
  min-height: 300px;
}

.language-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
