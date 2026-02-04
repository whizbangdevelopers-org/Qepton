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
          icon="star"
          label="Star"
          color="white"
          @click="handleBulkStar"
          :loading="isStarring"
          data-test="bulk-star-btn"
        >
          <q-tooltip>Star selected gists</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          icon="star_border"
          label="Unstar"
          color="white"
          @click="handleBulkUnstar"
          :loading="isUnstarring"
          data-test="bulk-unstar-btn"
        >
          <q-tooltip>Unstar selected gists</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          icon="push_pin"
          label="Pin"
          color="white"
          @click="handleBulkPin"
          data-test="bulk-pin-btn"
        >
          <q-tooltip>Pin selected gists</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          icon="push_pin"
          label="Unpin"
          color="white"
          class="unpin-btn"
          @click="handleBulkUnpin"
          data-test="bulk-unpin-btn"
        >
          <q-tooltip>Unpin selected gists</q-tooltip>
        </q-btn>

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
const isStarring = ref(false)
const isUnstarring = ref(false)
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

async function handleBulkStar() {
  if (isStarring.value) return

  isStarring.value = true
  const selectedIds = Array.from(gistsStore.selectedGistIds)

  try {
    const { success, failed } = await gistsStore.bulkStarGists(selectedIds)

    if (success.length > 0) {
      $q.notify({
        type: 'positive',
        message: `Starred ${success.length} gist${success.length > 1 ? 's' : ''}`,
        icon: 'star'
      })
    }

    if (failed.length > 0) {
      $q.notify({
        type: 'warning',
        message: `Failed to star ${failed.length} gist${failed.length > 1 ? 's' : ''}`,
        icon: 'warning'
      })
    }
  } catch (error) {
    console.error('Bulk star failed:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to star gists',
      icon: 'error'
    })
  } finally {
    isStarring.value = false
  }
}

async function handleBulkUnstar() {
  if (isUnstarring.value) return

  isUnstarring.value = true
  const selectedIds = Array.from(gistsStore.selectedGistIds)

  try {
    const { success, failed } = await gistsStore.bulkUnstarGists(selectedIds)

    if (success.length > 0) {
      $q.notify({
        type: 'positive',
        message: `Unstarred ${success.length} gist${success.length > 1 ? 's' : ''}`,
        icon: 'star_border'
      })
    }

    if (failed.length > 0) {
      $q.notify({
        type: 'warning',
        message: `Failed to unstar ${failed.length} gist${failed.length > 1 ? 's' : ''}`,
        icon: 'warning'
      })
    }
  } catch (error) {
    console.error('Bulk unstar failed:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to unstar gists',
      icon: 'error'
    })
  } finally {
    isUnstarring.value = false
  }
}

function handleBulkPin() {
  const selectedIds = Array.from(gistsStore.selectedGistIds)
  const count = gistsStore.bulkPinGists(selectedIds)

  if (count > 0) {
    $q.notify({
      type: 'positive',
      message: `Pinned ${count} gist${count > 1 ? 's' : ''}`,
      icon: 'push_pin'
    })
  } else {
    $q.notify({
      type: 'info',
      message: 'All selected gists are already pinned',
      icon: 'info'
    })
  }
}

function handleBulkUnpin() {
  const selectedIds = Array.from(gistsStore.selectedGistIds)
  const count = gistsStore.bulkUnpinGists(selectedIds)

  if (count > 0) {
    $q.notify({
      type: 'positive',
      message: `Unpinned ${count} gist${count > 1 ? 's' : ''}`,
      icon: 'push_pin'
    })
  } else {
    $q.notify({
      type: 'info',
      message: 'None of the selected gists were pinned',
      icon: 'info'
    })
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

.unpin-btn :deep(.q-icon) {
  transform: rotate(45deg);
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
