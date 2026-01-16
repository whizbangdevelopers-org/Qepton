<template>
  <q-dialog
    :model-value="uiStore.modals.newGist"
    @update:model-value="handleClose"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="new-gist-dialog">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">Create New Gist</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <!-- Form -->
      <q-card-section class="q-pt-md">
        <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
          <!-- Description -->
          <q-input
            v-model="description"
            label="Description"
            placeholder="My awesome snippet #javascript #utils"
            hint="Use #tag-name to add custom tags"
            outlined
            autofocus
            data-test="gist-description"
          />

          <!-- Public/Private Toggle -->
          <q-toggle
            v-model="isPublic"
            label="Public gist"
            color="primary"
            data-test="gist-public-toggle"
          />

          <!-- Files -->
          <div class="text-subtitle1 q-mt-md">Files</div>

          <div v-for="(file, index) in files" :key="index" class="file-entry q-mb-md">
            <div class="row q-col-gutter-sm items-center q-mb-sm">
              <div class="col">
                <q-input
                  v-model="file.filename"
                  label="Filename"
                  placeholder="example.js"
                  outlined
                  dense
                  :rules="[
                    val => !!val || 'Filename is required',
                    val => isValidFilename(val) || 'Invalid filename'
                  ]"
                  data-test="file-name"
                />
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="files.length > 1"
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="removeFile(index)"
                  data-test="remove-file"
                >
                  <q-tooltip>Remove file</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div class="q-mt-sm" data-test="file-content">
              <CodeEditor
                v-model="file.content"
                :filename="file.filename"
                height="300px"
                :autofocus="index === 0"
              />
            </div>
          </div>

          <!-- Add File Button -->
          <q-btn
            flat
            color="primary"
            icon="add"
            label="Add another file"
            @click="addFile"
            data-test="add-file"
          />
        </q-form>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" @click="handleClose" data-test="cancel-button" />
        <q-btn
          color="primary"
          label="Create Gist"
          :loading="isSubmitting"
          :disable="!isValid"
          @click="handleSubmit"
          data-test="submit-button"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import isValidFilenameLib from 'valid-filename'
import CodeEditor from 'src/components/CodeEditor.vue'

interface FileEntry {
  filename: string
  content: string
}

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const description = ref('')
const isPublic = ref(false)
const files = ref<FileEntry[]>([{ filename: '', content: '' }])
const isSubmitting = ref(false)

// Reset form when dialog opens
watch(
  () => uiStore.modals.newGist,
  isOpen => {
    if (isOpen) {
      resetForm()
    }
  }
)

function resetForm() {
  description.value = ''
  isPublic.value = false
  files.value = [{ filename: '', content: '' }]
}

function isValidFilename(name: string): boolean {
  if (!name) return true // Let required rule handle empty
  return isValidFilenameLib(name)
}

const isValid = computed(() => {
  // At least one file with filename and content
  return files.value.some(f => f.filename.trim() && f.content.trim())
})

function addFile() {
  files.value.push({ filename: '', content: '' })
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

function handleClose() {
  uiStore.closeModal('newGist')
}

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    // Build files object
    const filesObj: Record<string, { content: string }> = {}
    files.value.forEach(file => {
      if (file.filename.trim() && file.content.trim()) {
        filesObj[file.filename.trim()] = { content: file.content }
      }
    })

    await gistsStore.createGist(description.value, filesObj, isPublic.value)

    $q.notify({
      type: 'positive',
      message: 'Gist created successfully',
      icon: 'check_circle'
    })

    handleClose()
  } catch (error) {
    console.error('Failed to create gist:', error)
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to create gist',
      icon: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.new-gist-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

.q-card-section {
  overflow-y: auto;
}

.file-entry {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}
</style>
