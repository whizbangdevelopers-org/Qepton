<template>
  <q-dialog :model-value="uiStore.modals.cloneGist" @update:model-value="handleClose" persistent>
    <q-card style="min-width: 420px">
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="content_copy" color="primary" text-color="white" />
        <span class="q-ml-sm text-h6">Change Visibility</span>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section v-if="gistsStore.activeGist">
        <div class="text-subtitle2 q-mb-sm">{{ gistTitle }}</div>

        <q-banner class="bg-blue-1 text-dark q-mb-md" rounded>
          <template #avatar>
            <q-icon name="info" color="primary" />
          </template>
          <div class="text-caption">
            GitHub doesn't allow changing gist visibility directly. This will create a
            <strong>new {{ targetVisibility }}</strong> copy of your gist.
          </div>
        </q-banner>

        <q-list>
          <q-item>
            <q-item-section avatar>
              <q-icon :name="currentVisibilityIcon" :color="currentVisibilityColor" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Current</q-item-label>
              <q-item-label caption>{{ currentVisibility }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="arrow_forward" />
            </q-item-section>
            <q-item-section avatar>
              <q-icon :name="targetVisibilityIcon" :color="targetVisibilityColor" />
            </q-item-section>
            <q-item-section>
              <q-item-label>New</q-item-label>
              <q-item-label caption>{{ targetVisibility }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator class="q-my-md" />

        <div class="text-caption text-grey q-mb-sm">
          <q-icon name="history" size="xs" class="q-mr-xs" />
          Note: Version history cannot be transferred (GitHub limitation)
        </div>

        <q-checkbox
          v-model="deleteOriginal"
          label="Delete the original gist after cloning"
          color="negative"
          class="q-mt-sm"
        />

        <q-slide-transition>
          <q-banner v-if="deleteOriginal" class="bg-red-1 text-dark q-mt-sm" rounded dense>
            <template #avatar>
              <q-icon name="warning" color="negative" />
            </template>
            <div class="text-caption">
              The original <strong>{{ currentVisibility }}</strong> gist will be
              <strong>permanently deleted</strong> after the new gist is created.
              This cannot be undone.
            </div>
          </q-banner>
        </q-slide-transition>
      </q-card-section>

      <q-card-actions align="right" class="q-pt-none">
        <q-btn flat label="Cancel" @click="handleClose" data-test="cancel-clone" />
        <q-btn
          :color="deleteOriginal ? 'negative' : 'primary'"
          :label="deleteOriginal ? 'Clone & Delete Original' : 'Clone as ' + targetVisibility"
          :loading="isCloning"
          @click="handleClone"
          data-test="confirm-clone"
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
import { githubAPI } from 'src/services/github-api'

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const isCloning = ref(false)
const deleteOriginal = ref(false)

const gistTitle = computed(() => {
  const gist = gistsStore.activeGist
  if (!gist) return ''
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
})

const currentVisibility = computed(() => {
  return gistsStore.activeGist?.public ? 'Public' : 'Private'
})

const targetVisibility = computed(() => {
  return gistsStore.activeGist?.public ? 'Private' : 'Public'
})

const currentVisibilityIcon = computed(() => {
  return gistsStore.activeGist?.public ? 'public' : 'lock'
})

const targetVisibilityIcon = computed(() => {
  return gistsStore.activeGist?.public ? 'lock' : 'public'
})

const currentVisibilityColor = computed(() => {
  return gistsStore.activeGist?.public ? 'positive' : 'warning'
})

const targetVisibilityColor = computed(() => {
  return gistsStore.activeGist?.public ? 'warning' : 'positive'
})

function handleClose() {
  uiStore.closeModal('cloneGist')
  deleteOriginal.value = false
}

async function handleClone() {
  const gist = gistsStore.activeGist
  if (!gist || isCloning.value) return

  isCloning.value = true

  try {
    const newVisibility = gist.public ? 'private' : 'public'
    const newGist = await githubAPI.cloneGist(gist.id, newVisibility)

    if (deleteOriginal.value) {
      await gistsStore.deleteGist(gist.id)
    }

    await gistsStore.syncGists()
    gistsStore.setActiveGist(newGist.id)

    $q.notify({
      type: 'positive',
      message: deleteOriginal.value
        ? `Gist cloned as ${targetVisibility.value} and original deleted`
        : `Gist cloned as ${targetVisibility.value}`,
      icon: 'check_circle'
    })

    handleClose()
  } catch (error) {
    console.error('Failed to clone gist:', error)
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to clone gist',
      icon: 'error'
    })
  } finally {
    isCloning.value = false
  }
}
</script>
