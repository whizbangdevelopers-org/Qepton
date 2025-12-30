<template>
  <q-dialog
    :model-value="uiStore.modals.editGist"
    @update:model-value="handleClose"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="edit-gist-dialog">
      <!-- Header -->
      <q-card-section class="row items-center bg-primary text-white">
        <div class="text-h6">Edit Gist</div>
        <q-space />
        <q-btn
          flat
          label="Delete"
          icon="delete"
          @click="handleDeleteGist"
          class="q-mr-sm"
          data-test="delete-button"
        />
        <q-btn
          flat
          label="Save"
          icon="save"
          :loading="isSubmitting"
          :disable="!isValid"
          @click="handleSubmit"
          class="q-mr-sm"
          data-test="save-button"
        />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <!-- Loading State -->
      <q-card-section v-if="isLoading" class="flex flex-center q-pa-xl">
        <q-spinner-gears size="60px" color="primary" />
      </q-card-section>

      <!-- Form -->
      <q-card-section v-else class="q-pt-md">
        <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
          <!-- Description -->
          <q-input
            v-model="description"
            label="Description"
            hint="Use #tag-name to add custom tags"
            outlined
            autofocus
            data-test="gist-description"
          />

          <!-- Visibility and Timestamps -->
          <div class="row items-center q-gutter-sm">
            <q-icon
              :name="isPublic ? 'public' : 'lock'"
              :color="isPublic ? 'positive' : 'warning'"
              size="sm"
            />
            <span :class="isPublic ? 'text-positive' : 'text-warning'">
              {{ isPublic ? 'Public gist' : 'Secret gist' }}
            </span>
            <q-icon name="help_outline" size="xs" color="grey" class="cursor-pointer">
              <q-tooltip max-width="300px">
                GitHub does not allow changing gist visibility after creation.
                To change visibility: copy content, create a new gist with desired visibility, then delete this one.
              </q-tooltip>
            </q-icon>
            <q-space />
            <span class="text-caption text-grey-8">
              <q-icon name="update" size="xs" class="q-mr-xs" />
              Updated: {{ formatDate(updatedAt) }}
            </span>
            <span class="text-caption text-grey-8">
              <q-icon name="schedule" size="xs" class="q-mr-xs" />
              Created: {{ formatDate(createdAt) }}
            </span>
          </div>

          <!-- Files -->
          <div class="text-subtitle1 q-mt-md">Files</div>

          <div
            v-for="(file, index) in files"
            :key="file.originalName || index"
            class="file-entry q-mb-md"
          >
            <div class="row q-col-gutter-sm items-center q-mb-sm">
              <div class="col">
                <q-input
                  v-model="file.filename"
                  label="Filename"
                  outlined
                  dense
                  :rules="[val => !!val || 'Filename is required', val => isValidFilename(val) || 'Invalid filename']"
                  data-test="file-name"
                />
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="files.length > 1 || file.isNew"
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="removeFile(index)"
                  data-test="remove-file"
                >
                  <q-tooltip>{{ file.isNew ? 'Remove file' : 'Delete file' }}</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div class="q-mt-sm" data-test="file-content">
              <CodeEditor
                v-model="file.content"
                :filename="file.filename"
                height="300px"
              />
            </div>

            <div v-if="file.markedForDeletion" class="text-negative q-mt-xs">
              This file will be deleted when you save
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

      <!-- Bottom Actions -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="Delete"
          icon="delete"
          color="negative"
          @click="handleDeleteGist"
          data-test="delete-button-bottom"
        />
        <q-space />
        <q-btn
          flat
          label="Cancel"
          @click="handleClose"
          data-test="cancel-button"
        />
        <q-btn
          color="primary"
          label="Save Changes"
          icon="save"
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
  originalName: string | null  // null for new files
  isNew: boolean
  markedForDeletion: boolean
}

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const description = ref('')
const isPublic = ref(false)
const createdAt = ref('')
const updatedAt = ref('')
const files = ref<FileEntry[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)

// Load gist data when dialog opens
watch(() => uiStore.modals.editGist, (isOpen) => {
  if (isOpen && gistsStore.activeGist) {
    loadGistData()
  }
})

function loadGistData() {
  const gist = gistsStore.activeGist
  if (!gist) return

  isLoading.value = true

  description.value = gist.description || ''
  isPublic.value = gist.public
  createdAt.value = gist.created_at || ''
  updatedAt.value = gist.updated_at || ''

  // Convert gist files to editable format
  files.value = Object.entries(gist.files || {}).map(([filename, file]) => ({
    filename,
    content: file.content || '',
    originalName: filename,
    isNew: false,
    markedForDeletion: false
  }))

  isLoading.value = false
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleString()
}

function isValidFilename(name: string): boolean {
  if (!name) return true
  return isValidFilenameLib(name)
}

const isValid = computed(() => {
  // At least one non-deleted file with filename and content
  return files.value.some(f =>
    !f.markedForDeletion &&
    f.filename.trim() &&
    f.content.trim()
  )
})

function addFile() {
  files.value.push({
    filename: '',
    content: '',
    originalName: null,
    isNew: true,
    markedForDeletion: false
  })
}

function removeFile(index: number) {
  const file = files.value[index]
  if (file.isNew) {
    // New files can be removed directly
    files.value.splice(index, 1)
  } else {
    // Existing files are marked for deletion
    file.markedForDeletion = true
    file.content = '' // Clear content to signal deletion
  }
}

function handleClose() {
  uiStore.closeModal('editGist')
}

function handleDeleteGist() {
  handleClose()
  uiStore.openModal('deleteGist')
}

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return

  const gist = gistsStore.activeGist
  if (!gist) return

  isSubmitting.value = true

  try {
    // Build files object for update
    // GitHub API: set content to update, set to null to delete
    const filesObj: Record<string, { content: string } | null> = {}

    files.value.forEach(file => {
      if (file.markedForDeletion && file.originalName) {
        // Delete this file
        filesObj[file.originalName] = null
      } else if (file.filename.trim()) {
        if (file.originalName && file.originalName !== file.filename) {
          // Renamed file: delete old, create new
          filesObj[file.originalName] = null
          filesObj[file.filename.trim()] = { content: file.content }
        } else {
          // New or updated file
          filesObj[file.filename.trim()] = { content: file.content }
        }
      }
    })

    await gistsStore.updateGist(gist.id, description.value, filesObj)

    $q.notify({
      type: 'positive',
      message: 'Gist updated successfully',
      icon: 'check_circle'
    })

    handleClose()
  } catch (error) {
    console.error('Failed to update gist:', error)
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to update gist',
      icon: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.edit-gist-dialog {
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
