<template>
  <transition name="slide-up">
    <div v-if="gistsStore.selectedCount > 0" class="bulk-actions-bar">
      <div class="row items-center q-gutter-sm">
        <q-checkbox
          :model-value="allSelected"
          :indeterminate="someSelected && !allSelected"
          @update:model-value="toggleSelectAll"
          color="white"
          dark
        />
        <span class="text-body2">
          {{ gistsStore.selectedCount }} selected
        </span>

        <q-space />

        <q-btn
          flat
          dense
          icon="delete"
          label="Delete"
          color="white"
          @click="handleBulkDelete"
          :loading="isDeleting"
          data-test="bulk-delete-btn"
        >
          <q-tooltip>Delete selected gists</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          icon="close"
          color="white"
          @click="gistsStore.deselectAllGists()"
          data-test="bulk-clear-btn"
        >
          <q-tooltip>Clear selection</q-tooltip>
        </q-btn>
      </div>
    </div>
  </transition>

  <q-dialog v-model="showDeleteConfirm" persistent>
    <q-card style="min-width: 350px">
      <q-card-section class="row items-center">
        <q-avatar icon="warning" color="negative" text-color="white" />
        <span class="q-ml-sm text-h6">Delete {{ gistsStore.selectedCount }} Gists</span>
      </q-card-section>

      <q-card-section>
        <p>Are you sure you want to delete {{ gistsStore.selectedCount }} gists?</p>
        <p class="text-caption text-grey">
          This action cannot be undone. These gists will be permanently deleted from GitHub.
        </p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="showDeleteConfirm = false" />
        <q-btn
          color="negative"
          label="Delete All"
          :loading="isDeleting"
          @click="confirmBulkDelete"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useGistsStore } from 'src/stores/gists'

const props = defineProps<{
  visibleGistIds: string[]
}>()

const $q = useQuasar()
const gistsStore = useGistsStore()

const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

const allSelected = computed(() => {
  if (props.visibleGistIds.length === 0) return false
  return props.visibleGistIds.every(id => gistsStore.isGistSelected(id))
})

const someSelected = computed(() => {
  return props.visibleGistIds.some(id => gistsStore.isGistSelected(id))
})

function toggleSelectAll(value: boolean) {
  if (value) {
    gistsStore.selectAllGists(props.visibleGistIds)
  } else {
    gistsStore.deselectAllGists()
  }
}

function handleBulkDelete() {
  showDeleteConfirm.value = true
}

async function confirmBulkDelete() {
  if (isDeleting.value) return

  isDeleting.value = true
  const selectedIds = Array.from(gistsStore.selectedGistIds)

  try {
    const { success, failed } = await gistsStore.bulkDeleteGists(selectedIds)

    if (success.length > 0) {
      $q.notify({
        type: 'positive',
        message: `Deleted ${success.length} gist${success.length > 1 ? 's' : ''}`,
        icon: 'check_circle'
      })
    }

    if (failed.length > 0) {
      $q.notify({
        type: 'warning',
        message: `Failed to delete ${failed.length} gist${failed.length > 1 ? 's' : ''}`,
        icon: 'warning'
      })
    }

    showDeleteConfirm.value = false
  } catch (error) {
    console.error('Bulk delete failed:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to delete gists',
      icon: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<style lang="scss" scoped>
.bulk-actions-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--q-primary);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
