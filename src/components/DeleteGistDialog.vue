<template>
  <q-dialog :model-value="uiStore.modals.deleteGist" @update:model-value="handleClose" persistent>
    <q-card style="min-width: 350px">
      <q-card-section class="row items-center">
        <q-avatar icon="warning" color="negative" text-color="white" />
        <span class="q-ml-sm text-h6">Delete Gist</span>
      </q-card-section>

      <q-card-section v-if="gistsStore.activeGist">
        <p>Are you sure you want to delete this gist?</p>
        <p class="text-weight-bold">{{ gistTitle }}</p>
        <p class="text-caption text-grey">
          This action cannot be undone. The gist will be permanently deleted from GitHub.
        </p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="handleClose" data-test="cancel-delete" />
        <q-btn
          color="negative"
          label="Delete"
          :loading="isDeleting"
          @click="handleDelete"
          data-test="confirm-delete"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import { parseDescription } from 'src/services/parser'

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const isDeleting = ref(false)

const gistTitle = computed(() => {
  const gist = gistsStore.activeGist
  if (!gist) return ''

  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
})

function handleClose() {
  uiStore.closeModal('deleteGist')
}

async function handleDelete() {
  const gist = gistsStore.activeGist
  if (!gist || isDeleting.value) return

  isDeleting.value = true

  try {
    await gistsStore.deleteGist(gist.id)

    $q.notify({
      type: 'positive',
      message: 'Gist deleted successfully',
      icon: 'check_circle'
    })

    handleClose()
  } catch (error) {
    console.error('Failed to delete gist:', error)
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to delete gist',
      icon: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>
