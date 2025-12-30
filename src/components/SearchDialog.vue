<template>
  <q-dialog
    :model-value="uiStore.modals.search"
    @update:model-value="handleClose"
    position="top"
    transition-show="slide-down"
    transition-hide="slide-up"
    data-test="search-dialog"
  >
    <q-card class="search-dialog">
      <q-card-section class="q-pa-sm">
        <q-input
          v-model="query"
          placeholder="Search gists..."
          outlined
          dense
          autofocus
          clearable
          @keydown.enter="selectFirstResult"
          @keydown.escape="handleClose"
          @keydown.down.prevent="focusNextResult"
          @keydown.up.prevent="focusPrevResult"
          data-test="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>

      <q-separator v-if="query.length > 1" />

      <q-card-section v-if="query.length > 1" class="q-pa-none search-results">
        <q-list v-if="results.length > 0">
          <q-item
            v-for="(gist, index) in results"
            :key="gist.id"
            clickable
            v-ripple
            :active="focusedIndex === index"
            @click="selectGist(gist)"
            :data-test="`search-result-${index}`"
          >
            <q-item-section avatar>
              <q-icon
                :name="gist.public ? 'code' : 'lock'"
                :color="gist.public ? 'primary' : 'warning'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getGistTitle(gist) }}</q-item-label>
              <q-item-label caption>
                {{ getFileNames(gist) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>
                {{ formatDate(gist.updated_at) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="q-pa-md text-center text-grey">
          No results found for "{{ query }}"
        </div>
      </q-card-section>

      <q-card-section v-else-if="query.length === 1" class="q-pa-md text-center text-grey">
        Type at least 2 characters to search
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import { searchService } from 'src/services/search'
import { parseDescription } from 'src/services/parser'
import type { Gist } from 'src/types/github'
import moment from 'moment'

const router = useRouter()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const query = ref('')
const focusedIndex = ref(0)

const results = computed(() => {
  if (query.value.length <= 1) return []
  return searchService.search(query.value).slice(0, 10)
})

watch(() => uiStore.modals.search, (isOpen) => {
  if (isOpen) {
    query.value = ''
    focusedIndex.value = 0
  }
})

watch(query, () => {
  focusedIndex.value = 0
})

function getGistTitle(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
}

function getFileNames(gist: Gist): string {
  const files = Object.keys(gist.files || {})
  if (files.length === 0) return 'No files'
  if (files.length <= 3) return files.join(', ')
  return `${files.slice(0, 3).join(', ')} +${files.length - 3} more`
}

function formatDate(dateStr: string): string {
  return moment(dateStr).fromNow()
}

function handleClose() {
  uiStore.closeModal('search')
}

function selectGist(gist: Gist) {
  gistsStore.setActiveGist(gist.id)
  handleClose()
  router.push('/')
}

function selectFirstResult() {
  if (results.value.length > 0) {
    selectGist(results.value[focusedIndex.value])
  }
}

function focusNextResult() {
  if (results.value.length > 0) {
    focusedIndex.value = (focusedIndex.value + 1) % results.value.length
  }
}

function focusPrevResult() {
  if (results.value.length > 0) {
    focusedIndex.value = focusedIndex.value === 0 
      ? results.value.length - 1 
      : focusedIndex.value - 1
  }
}
</script>

<style lang="scss" scoped>
.search-dialog {
  width: 100%;
  max-width: 600px;
  margin-top: 60px;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}
</style>
