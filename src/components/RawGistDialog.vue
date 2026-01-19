<template>
  <q-dialog
    :model-value="uiStore.modals.rawGist"
    @update:model-value="handleClose"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    data-test="raw-gist-dialog"
  >
    <q-card class="raw-gist-dialog">
      <q-card-section class="row items-center q-pb-none bg-dark text-white">
        <div class="text-h6">
          Raw Content
          <q-chip v-if="fileCount > 1" dense color="primary" text-color="white" class="q-ml-sm">
            {{ fileCount }} files
          </q-chip>
        </div>
        <q-space />
        <q-btn flat round dense icon="unfold_more" @click="expandAll" data-test="expand-all">
          <q-tooltip>Expand all</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="unfold_less" @click="collapseAll" data-test="collapse-all">
          <q-tooltip>Collapse all</q-tooltip>
        </q-btn>
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section class="raw-content-section">
        <div class="file-accordion">
          <div v-for="(file, filename) in files" :key="filename" class="file-item-wrapper">
            <q-expansion-item
              :group="fileCount === 1 ? undefined : 'files'"
              :default-opened="fileCount === 1"
              v-model="expandedState[String(filename)]"
              class="file-item"
              header-class="file-header"
              data-test="file-accordion-item"
            >
              <template #header>
                <q-item-section avatar class="file-icon-section">
                  <q-icon name="description" color="grey-6" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="file-name">{{ filename }}</q-item-label>
                  <q-item-label caption>
                    <q-chip v-if="file.language" dense size="sm" color="grey-8" text-color="grey-3">
                      {{ file.language }}
                    </q-chip>
                    <span class="text-grey-5 q-ml-sm">{{ formatSize(file.size) }}</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    round
                    icon="content_copy"
                    size="sm"
                    @click.stop="copyFileContent(file.content)"
                    data-test="copy-file"
                  >
                    <q-tooltip>Copy {{ filename }}</q-tooltip>
                  </q-btn>
                </q-item-section>
              </template>

              <div class="file-content-wrapper">
                <pre class="file-content" data-test="file-raw-content">{{
                  file.content || '(empty)'
                }}</pre>
              </div>
            </q-expansion-item>

            <div
              v-if="!expandedState[String(filename)]"
              class="file-preview"
              data-test="file-preview"
              @click="expandedState[String(filename)] = true"
            >
              <pre>{{ getPreview(file.content) }}</pre>
              <div v-if="hasMoreLines(file.content)" class="preview-fade">
                <span class="preview-more"
                  >{{ countRemainingLines(file.content) }} more lines - click to expand</span
                >
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const expandedState = reactive<Record<string, boolean>>({})

const files = computed(() => gistsStore.activeGist?.files || {})
const fileCount = computed(() => Object.keys(files.value).length)

watch(
  () => uiStore.modals.rawGist,
  isOpen => {
    if (isOpen) {
      Object.keys(expandedState).forEach(key => delete expandedState[key])
      if (fileCount.value === 1) {
        const firstFile = Object.keys(files.value)[0]
        if (firstFile) expandedState[firstFile] = true
      }
    }
  }
)

function handleClose() {
  uiStore.closeModal('rawGist')
}

function getPreview(content: string | undefined): string {
  if (!content) return '(empty)'
  const lines = content.split('\n')
  return lines.slice(0, uiStore.previewLines).join('\n')
}

function hasMoreLines(content: string | undefined): boolean {
  if (!content) return false
  return content.split('\n').length > uiStore.previewLines
}

function countRemainingLines(content: string | undefined): number {
  if (!content) return 0
  const totalLines = content.split('\n').length
  return Math.max(0, totalLines - uiStore.previewLines)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function expandAll() {
  Object.keys(files.value).forEach(filename => {
    expandedState[filename] = true
  })
}

function collapseAll() {
  Object.keys(files.value).forEach(filename => {
    expandedState[filename] = false
  })
}

async function copyFileContent(content: string | undefined) {
  if (!content) return

  try {
    await navigator.clipboard.writeText(content)
    $q.notify({
      type: 'positive',
      message: 'Copied to clipboard',
      icon: 'check_circle',
      timeout: 1500
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to copy',
      icon: 'error'
    })
  }
}
</script>

<style lang="scss" scoped>
.raw-gist-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

.raw-content-section {
  flex: 1;
  overflow: auto;
  background: #1a1a1a;
  padding: 8px;
}

.file-accordion {
  background: transparent;
}

.file-item-wrapper {
  background: #252525;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.file-item {
  :deep(.q-expansion-item__container) {
    background: transparent;
  }

  :deep(.q-item) {
    min-height: 56px;
  }
}

.file-header {
  background: #2d2d2d;

  &:hover {
    background: #353535;
  }
}

.file-icon-section {
  min-width: 40px;
}

.file-name {
  font-family: 'Fira Code', monospace;
  font-weight: 500;
  color: #e0e0e0;
}

.file-content-wrapper {
  background: #1e1e1e;
  max-height: 60vh;
  overflow: auto;
}

.file-content {
  margin: 0;
  padding: 16px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.file-preview {
  position: relative;
  background: #1e1e1e;
  padding: 12px 16px;
  padding-bottom: 32px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #242424;
  }

  pre {
    margin: 0;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #888;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}

.preview-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, #1e1e1e);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  pointer-events: none;
}

.file-preview:hover .preview-fade {
  background: linear-gradient(transparent, #242424);
}

.preview-more {
  font-size: 12px;
  color: #888;
  font-style: italic;
  background: rgba(30, 30, 30, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
