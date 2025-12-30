<template>
  <div class="gist-preview-panel" data-test="gist-preview-panel">
    <!-- Empty State -->
    <div v-if="!activeGist" class="empty-state flex flex-center">
      <div class="text-center">
        <q-icon name="mdi-file-document-outline" size="64px" color="grey-5" />
        <div class="text-h6 text-grey-6 q-mt-md">Select a gist to preview</div>
        <div class="text-caption text-grey-5 q-mt-sm">
          Click on any gist from the list to view its contents
        </div>
      </div>
    </div>

    <!-- Gist Content -->
    <div v-else class="gist-content">
      <!-- Header -->
      <div class="gist-header q-pa-md">
        <div class="row items-start">
          <div class="col">
            <div class="text-h6 text-weight-bold">{{ gistTitle }}</div>
            <div class="row items-center q-gutter-xs q-mt-xs">
              <q-icon
                :name="activeGist.public ? 'public' : 'lock'"
                :color="activeGist.public ? 'positive' : 'warning'"
                size="sm"
              />
              <span :class="activeGist.public ? 'text-positive' : 'text-warning'" class="text-caption">
                {{ activeGist.public ? 'Public' : 'Secret' }}
              </span>
              <q-chip dense size="sm" color="grey-8" text-color="white">
                {{ fileCount }} {{ fileCount === 1 ? 'file' : 'files' }}
              </q-chip>
              <span class="text-caption text-grey-6">
                Updated {{ formatDate(activeGist.updated_at) }}
              </span>
            </div>
            <div v-if="gistDescription" class="text-body2 text-grey-7 q-mt-sm">
              {{ gistDescription }}
            </div>
          </div>
          <div class="col-auto">
            <q-btn flat dense round icon="edit" @click="handleEdit" data-test="edit-gist-btn">
              <q-tooltip>Edit (Cmd/Ctrl+E)</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" @click="handleDelete" data-test="delete-gist-btn">
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- Display Mode Toggle -->
      <div class="display-controls q-px-md q-pb-sm">
        <div class="row items-center">
          <q-btn-toggle
            v-model="displayMode"
            dense
            flat
            toggle-color="primary"
            :options="[
              { label: 'Formatted', value: 'formatted' },
              { label: 'Raw', value: 'raw' }
            ]"
            data-test="display-mode-toggle"
          />
          <q-space />
          <q-btn
            flat
            dense
            round
            icon="unfold_more"
            @click="expandAllFiles"
            data-test="expand-all-files"
          >
            <q-tooltip>Expand all</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="unfold_less"
            @click="collapseAllFiles"
            data-test="collapse-all-files"
          >
            <q-tooltip>Collapse all</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-center q-py-xl">
        <q-spinner-dots size="40px" color="primary" />
        <span class="q-ml-sm text-grey-7">Loading content...</span>
      </div>

      <!-- File List -->
      <div v-else class="file-list q-px-md q-pb-md">
        <div
          v-for="(file, filename) in activeGist.files"
          :key="filename"
          class="file-item-wrapper"
        >
          <q-expansion-item
            v-model="expandedFiles[String(filename)]"
            :group="fileCount === 1 ? undefined : 'gist-files'"
            :default-opened="fileCount === 1"
            class="file-item"
            header-class="file-header"
            data-test="file-accordion-item"
          >
            <template #header>
              <q-item-section avatar class="file-icon-section">
                <q-icon :name="getFileIcon(String(filename))" color="grey-6" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="file-name">{{ filename }}</q-item-label>
                <q-item-label caption>
                  <q-chip
                    v-if="file.language"
                    dense
                    size="sm"
                    color="grey-8"
                    text-color="grey-3"
                  >
                    {{ file.language }}
                  </q-chip>
                  <span class="text-grey-6 q-ml-sm">{{ formatFileSize(file.size) }}</span>
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
                  data-test="copy-code-button"
                >
                  <q-tooltip>Copy {{ filename }}</q-tooltip>
                </q-btn>
              </q-item-section>
            </template>

            <!-- Expanded content -->
            <div class="file-content-expanded">
              <template v-if="displayMode === 'raw'">
                <pre class="raw-content">{{ file.content || '(empty)' }}</pre>
              </template>
              <template v-else>
                <div
                  v-if="isMarkdownFile(String(filename))"
                  class="markdown-preview q-pa-md"
                  data-test="markdown-preview"
                  v-html="renderMarkdown(file.content || '')"
                />
                <div
                  v-else-if="isJupyterFile(String(filename))"
                  class="jupyter-preview q-pa-md"
                  data-test="jupyter-preview"
                  v-html="renderJupyter(file.content)"
                />
                <div v-else data-test="file-content">
                  <CodeEditor
                    :model-value="file.content || ''"
                    :filename="String(filename)"
                    height="400px"
                    readonly
                  />
                </div>
              </template>
            </div>
          </q-expansion-item>

          <!-- Preview when collapsed -->
          <div
            v-if="!expandedFiles[String(filename)]"
            class="file-preview"
            data-test="file-preview"
            @click="expandedFiles[String(filename)] = true"
          >
            <pre>{{ getFilePreview(file.content) }}</pre>
            <div v-if="hasMoreLines(file.content)" class="preview-fade">
              <span class="preview-more">{{ countRemainingLines(file.content) }} more lines</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import CodeEditor from 'src/components/CodeEditor.vue'
import { parseDescription } from 'src/services/parser'
import { renderMarkdown } from 'src/services/markdown'
import { renderNotebook, isJupyterNotebook, isJupyterFile } from 'src/services/jupyter'

const $q = useQuasar()
const gistsStore = useGistsStore()
const uiStore = useUIStore()

const displayMode = ref<'formatted' | 'raw'>('formatted')
const expandedFiles = reactive<Record<string, boolean>>({})

const activeGist = computed(() => gistsStore.activeGist)
const isLoading = computed(() => activeGist.value && gistsStore.isGistLoading(activeGist.value.id))
const fileCount = computed(() => activeGist.value ? Object.keys(activeGist.value.files).length : 0)

const gistTitle = computed(() => {
  if (!activeGist.value) return ''
  const parsed = parseDescription(activeGist.value.description)
  return parsed.title || activeGist.value.description || 'Untitled'
})

const gistDescription = computed(() => {
  if (!activeGist.value) return ''
  const parsed = parseDescription(activeGist.value.description)
  return parsed.description || ''
})

// Watch for gist changes to reset state
watch(activeGist, (newGist, oldGist) => {
  if (newGist?.id !== oldGist?.id) {
    // Reset expanded files
    Object.keys(expandedFiles).forEach(key => delete expandedFiles[key])
    if (newGist?.files) {
      const fileCount = Object.keys(newGist.files).length
      if (fileCount === 1) {
        const firstFile = Object.keys(newGist.files)[0]
        expandedFiles[firstFile] = true
      }
    }
    displayMode.value = 'formatted'
  }
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string): string {
  if (isMarkdownFile(filename)) return 'description'
  if (isJupyterFile(filename)) return 'science'
  if (/\.(js|ts|jsx|tsx)$/i.test(filename)) return 'javascript'
  if (/\.(py)$/i.test(filename)) return 'code'
  if (/\.(json|yaml|yml)$/i.test(filename)) return 'data_object'
  if (/\.(html|css|scss)$/i.test(filename)) return 'web'
  return 'insert_drive_file'
}

function isMarkdownFile(filename: string): boolean {
  return /\.(md|markdown)$/i.test(filename)
}

function renderJupyter(content: string | undefined): string {
  if (!content) return ''
  try {
    if (isJupyterNotebook(content)) {
      return renderNotebook(content)
    }
    return '<div class="error">Invalid Jupyter notebook format</div>'
  } catch {
    return '<div class="error">Failed to render notebook</div>'
  }
}

function getFilePreview(content: string | undefined): string {
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

function expandAllFiles() {
  if (activeGist.value?.files) {
    Object.keys(activeGist.value.files).forEach(filename => {
      expandedFiles[filename] = true
    })
  }
}

function collapseAllFiles() {
  if (activeGist.value?.files) {
    Object.keys(activeGist.value.files).forEach(filename => {
      expandedFiles[filename] = false
    })
  }
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

function handleEdit() {
  uiStore.openModal('editGist')
}

function handleDelete() {
  uiStore.openModal('deleteGist')
}
</script>

<style lang="scss" scoped>
.gist-preview-panel {
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-state {
  height: 100%;
  flex: 1;
}

.gist-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.gist-header {
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.display-controls {
  flex-shrink: 0;
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.file-item-wrapper {
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
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
  background: var(--bg-primary);

  &:hover {
    background: var(--bg-secondary);
  }
}

.file-icon-section {
  min-width: 40px;
}

.file-name {
  font-family: 'Fira Code', monospace;
  font-weight: 500;
}

.file-content-expanded {
  max-height: 500px;
  overflow: auto;
}

.raw-content {
  margin: 0;
  padding: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--bg-secondary);
}

.file-preview {
  position: relative;
  background: var(--bg-secondary);
  padding: 12px 16px;
  padding-bottom: 32px;
  cursor: pointer;
  transition: background 0.2s;
  border-top: 1px solid var(--border-color);

  &:hover {
    background: var(--bg-primary);
  }

  pre {
    margin: 0;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-secondary);
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
  background: linear-gradient(transparent, var(--bg-secondary));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  pointer-events: none;
}

.file-preview:hover .preview-fade {
  background: linear-gradient(transparent, var(--bg-primary));
}

.preview-more {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.markdown-preview {
  background: var(--bg-primary);
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  :deep(h3) { font-size: 1.25em; }

  :deep(p) { margin: 1em 0; line-height: 1.6; }

  :deep(a) { color: var(--q-primary); text-decoration: none; &:hover { text-decoration: underline; } }

  :deep(code) {
    background: var(--bg-secondary);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(ul), :deep(ol) { padding-left: 2em; margin: 1em 0; }
  :deep(li) { margin: 0.25em 0; }

  :deep(blockquote) {
    border-left: 4px solid var(--q-primary);
    margin: 1em 0;
    padding-left: 1em;
    color: var(--text-secondary);
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;

    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }

    th { background: var(--bg-secondary); font-weight: 600; }
  }

  :deep(img) { max-width: 100%; height: auto; }

  :deep(hr) { border: none; border-top: 1px solid var(--border-color); margin: 2em 0; }
}

.jupyter-preview {
  background: var(--bg-primary);
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;

  :deep(.nb-notebook) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :deep(.nb-cell) {
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  :deep(.nb-input), :deep(.nb-output) {
    padding: 12px;
  }

  :deep(.nb-input) {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  :deep(.nb-output) {
    background: var(--bg-primary);
  }

  :deep(.nb-stdout), :deep(.nb-stderr) {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  :deep(.nb-stderr) {
    color: #d32f2f;
  }

  :deep(pre) {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
  }

  :deep(code) {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }

  :deep(.nb-markdown) {
    padding: 12px 16px;

    h1, h2, h3, h4, h5, h6 {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    p { margin: 0.5em 0; line-height: 1.6; }
    ul, ol { padding-left: 1.5em; }
  }

  :deep(.nb-output img) {
    max-width: 100%;
    height: auto;
  }

  :deep(table) {
    border-collapse: collapse;
    margin: 8px 0;

    th, td {
      border: 1px solid var(--border-color);
      padding: 6px 10px;
    }
  }

  .error {
    color: #d32f2f;
    padding: 16px;
    text-align: center;
  }
}
</style>
