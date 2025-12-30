<template>
  <div class="tag-details-panel q-pa-md">
    <!-- Tag Header -->
    <div class="tag-header q-mb-md">
      <div class="text-h6">{{ formatTagName(gistsStore.activeTag) }}</div>
      <q-chip
        dense
        :color="isLanguageTag ? 'primary' : 'secondary'"
        text-color="white"
        class="q-mt-xs"
      >
        {{ isLanguageTag ? 'Language Tag' : 'Custom Tag' }}
      </q-chip>
    </div>

    <!-- Tag Statistics -->
    <div class="tag-stats q-mb-md">
      <q-card flat bordered>
        <q-card-section>
          <div class="row items-center">
            <q-icon name="mdi-code-braces" size="md" color="primary" class="q-mr-sm" />
            <div>
              <div class="text-caption text-grey-7">Total Gists</div>
              <div class="text-h6">{{ gistCount }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Gist List -->
    <div class="gist-thumbnails">
      <div class="text-subtitle2 q-mb-sm">Gists in this tag</div>

      <!-- Empty State -->
      <div v-if="gistCount === 0" class="text-center text-grey-6 q-pa-md">
        <q-icon name="mdi-inbox" size="48px" />
        <div class="q-mt-sm">No gists with this tag</div>
      </div>

      <!-- Gist List -->
      <q-list v-else bordered separator>
        <q-item
          v-for="gist in sortedGists"
          :key="gist.id"
          clickable
          :active="gistsStore.activeGistId === gist.id"
          @click="selectGist(gist.id)"
          data-test="tag-detail-gist-item"
        >
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ getGistTitle(gist) }}
            </q-item-label>
            <q-item-label caption lines="2">
              {{ getGistDescription(gist) }}
            </q-item-label>
            <q-item-label caption class="q-mt-xs">
              <q-icon
                :name="gist.public ? 'public' : 'lock'"
                size="xs"
                :color="gist.public ? 'positive' : 'warning'"
                class="q-mr-xs"
              />
              {{ formatDate(gist.updated_at) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGistsStore } from 'src/stores/gists'
import { parseDescription } from 'src/services/parser'
import type { Gist } from 'src/types/github'

const gistsStore = useGistsStore()

// Computed properties
const isLanguageTag = computed(() => {
  return gistsStore.activeTag.startsWith('lang@')
})

const gistCount = computed(() => {
  if (gistsStore.activeTag === 'All Gists') {
    return gistsStore.totalGists
  }
  const tagGists = gistsStore.gistTags[gistsStore.activeTag]
  return tagGists ? tagGists.size : 0
})

const sortedGists = computed(() => {
  const gists = gistsStore.gistsByTag(gistsStore.activeTag)

  // Sort by updated_at by default (most recent first)
  return [...gists].sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime()
    const dateB = new Date(b.updated_at).getTime()
    return dateB - dateA
  })
})

// Helper functions
function formatTagName(tag: string): string {
  if (tag === 'All Gists') return 'All Gists'
  if (tag.startsWith('lang@')) {
    return tag.substring(5) // Remove 'lang@' prefix
  }
  return `#${tag}`
}

function getGistTitle(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
}

function getGistDescription(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  if (parsed.title) {
    return parsed.description || 'No description'
  }
  // If no title in brackets, show filename instead
  const firstFilename = Object.keys(gist.files || {})[0]
  return firstFilename || 'No files'
}

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

function selectGist(gistId: string) {
  gistsStore.setActiveGist(gistId)
}
</script>

<style lang="scss" scoped>
.tag-details-panel {
  background: var(--bg-primary);
  height: 100%;
}

.tag-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.gist-thumbnails {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}
</style>
