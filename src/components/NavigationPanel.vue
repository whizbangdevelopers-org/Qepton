<template>
  <div class="navigation-panel">
    <!-- User Panel -->
    <UserPanel />

    <q-separator class="q-my-md" />

    <!-- All Gists -->
    <div class="nav-section q-mb-md">
      <q-item
        clickable
        :active="gistsStore.activeTag === 'All Gists'"
        @click="selectTag('All Gists')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="mdi-code-braces" />
        </q-item-section>
        <q-item-section>
          <q-item-label>All Gists</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge color="primary">{{ gistsStore.totalGists }}</q-badge>
        </q-item-section>
      </q-item>

      <!-- Starred Gists -->
      <q-item
        clickable
        :active="gistsStore.activeTag === 'Starred'"
        @click="selectTag('Starred')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="star" color="amber" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Starred</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge color="amber" text-color="dark">{{ gistsStore.starredCount }}</q-badge>
        </q-item-section>
      </q-item>

      <!-- Recent Gists -->
      <q-item
        v-if="gistsStore.recentCount > 0"
        clickable
        :active="gistsStore.activeTag === 'Recents'"
        @click="selectTag('Recents')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="history" color="blue-grey" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Recents</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge color="blue-grey">{{ gistsStore.recentCount }}</q-badge>
        </q-item-section>
      </q-item>
    </div>

    <!-- Pinned Tags with Drag-and-Drop -->
    <div v-if="pinnedTags.length > 0" class="nav-section q-mb-md">
      <div class="section-header q-px-md q-py-xs">
        <span class="text-caption text-weight-bold text-grey-7">PINNED</span>
        <q-btn
          flat
          dense
          round
          size="xs"
          icon="settings"
          @click="uiStore.openModal('pinnedTags')"
        >
          <q-tooltip>Manage Pinned Tags</q-tooltip>
        </q-btn>
      </div>

      <q-list dense>
        <q-item
          v-for="(tag, index) in pinnedTags"
          :key="tag"
          clickable
          :active="gistsStore.activeTag === tag"
          @click="selectTag(tag)"
          class="tag-item pinned-tag-item"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
          :class="{ 'drag-over': dragOverIndex === index }"
        >
          <q-item-section avatar>
            <q-icon name="drag_indicator" size="xs" class="drag-handle" />
          </q-item-section>
          <q-item-section avatar>
            <q-icon :name="getTagIcon(tag)" size="xs" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-caption">
              {{ formatTagName(tag) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge color="grey-6" text-color="white">
              {{ getTagCount(tag) }}
            </q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Language Tags Drawer -->
    <q-expansion-item
      v-if="uiStore.navDrawers.languagesVisible"
      v-model="uiStore.navDrawers.languagesExpanded"
      dense
      header-class="section-header-expandable"
    >
      <template #header>
        <q-item-section avatar>
          <q-icon name="mdi-code-tags" size="sm" />
        </q-item-section>
        <q-item-section>
          <span class="text-caption text-weight-bold">LANGUAGES</span>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center no-wrap">
            <q-badge color="primary" text-color="white" class="q-mr-xs">
              {{ languageTags.length }}
            </q-badge>
            <q-btn
              flat
              dense
              round
              size="xs"
              icon="visibility_off"
              @click.stop="uiStore.toggleNavDrawerVisibility('languages')"
            >
              <q-tooltip>Hide Languages</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </template>

      <q-scroll-area style="height: 180px">
        <q-list dense>
          <q-item
            v-for="tag in languageTags"
            :key="tag"
            clickable
            :active="gistsStore.activeTag === tag"
            @click="selectTag(tag)"
            class="tag-item"
            data-test="language-tag"
          >
            <q-item-section avatar>
              <q-icon name="mdi-code-tags" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption">
                {{ formatTagName(tag) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center">
                <q-badge color="grey-6" text-color="white" class="q-mr-xs">
                  {{ getTagCount(tag) }}
                </q-badge>
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  :icon="isPinned(tag) ? 'push_pin' : 'mdi-pin-outline'"
                  @click.stop="togglePin(tag)"
                >
                  <q-tooltip>
                    {{ isPinned(tag) ? 'Unpin' : 'Pin' }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-expansion-item>

    <!-- Show Languages button when hidden -->
    <q-item
      v-else
      clickable
      dense
      @click="uiStore.toggleNavDrawerVisibility('languages')"
      class="hidden-drawer-item"
    >
      <q-item-section avatar>
        <q-icon name="mdi-code-tags" size="sm" color="grey-6" />
      </q-item-section>
      <q-item-section>
        <span class="text-caption text-grey-6">Show Languages ({{ languageTags.length }})</span>
      </q-item-section>
    </q-item>

    <q-separator class="q-my-sm" />

    <!-- Custom Tags Drawer -->
    <q-expansion-item
      v-if="uiStore.navDrawers.tagsVisible"
      v-model="uiStore.navDrawers.tagsExpanded"
      dense
      header-class="section-header-expandable"
    >
      <template #header>
        <q-item-section avatar>
          <q-icon name="mdi-tag" size="sm" />
        </q-item-section>
        <q-item-section>
          <span class="text-caption text-weight-bold">TAGS</span>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center no-wrap">
            <q-badge color="primary" text-color="white" class="q-mr-xs">
              {{ customTags.length }}
            </q-badge>
            <q-btn
              flat
              dense
              round
              size="xs"
              icon="visibility_off"
              @click.stop="uiStore.toggleNavDrawerVisibility('tags')"
            >
              <q-tooltip>Hide Tags</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </template>

      <q-scroll-area style="height: 180px">
        <q-list dense>
          <q-item
            v-for="tag in customTags"
            :key="tag"
            clickable
            :active="gistsStore.activeTag === tag"
            @click="selectTag(tag)"
            class="tag-item"
          >
            <q-item-section avatar>
              <q-icon name="mdi-tag" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption">
                #{{ tag }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center">
                <q-badge color="grey-6" text-color="white" class="q-mr-xs">
                  {{ getTagCount(tag) }}
                </q-badge>
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  :icon="isPinned(tag) ? 'push_pin' : 'mdi-pin-outline'"
                  @click.stop="togglePin(tag)"
                >
                  <q-tooltip>
                    {{ isPinned(tag) ? 'Unpin' : 'Pin' }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>

          <!-- Empty state -->
          <q-item v-if="customTags.length === 0">
            <q-item-section class="text-center text-grey-6">
              <q-item-label caption>
                No custom tags yet
              </q-item-label>
              <q-item-label caption class="q-mt-xs">
                Add #tags to gist descriptions
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-expansion-item>

    <!-- Show Tags button when hidden -->
    <q-item
      v-else
      clickable
      dense
      @click="uiStore.toggleNavDrawerVisibility('tags')"
      class="hidden-drawer-item"
    >
      <q-item-section avatar>
        <q-icon name="mdi-tag" size="sm" color="grey-6" />
      </q-item-section>
      <q-item-section>
        <span class="text-caption text-grey-6">Show Tags ({{ customTags.length }})</span>
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import { parseLangName } from 'src/services/parser'
import UserPanel from './UserPanel.vue'

const gistsStore = useGistsStore()
const uiStore = useUIStore()

// Drag and drop state
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Computed properties
const pinnedTags = computed(() => {
  return gistsStore.pinnedTags.filter(tag => gistsStore.gistTags[tag])
})

const languageTags = computed(() => gistsStore.languageTags)
const customTags = computed(() => gistsStore.customTags)

// Methods
function selectTag(tag: string) {
  gistsStore.setActiveTag(tag)
}

function formatTagName(tag: string): string {
  if (tag.startsWith('lang@')) {
    return parseLangName(tag)
  }
  return tag
}

function getTagIcon(tag: string): string {
  if (tag.startsWith('lang@')) {
    return 'mdi-code-tags'
  }
  return 'mdi-tag'
}

function getTagCount(tag: string): number {
  const tagInfo = gistsStore.tagInfo(tag)
  return tagInfo ? tagInfo.count : 0
}

function isPinned(tag: string): boolean {
  return gistsStore.pinnedTags.includes(tag)
}

function togglePin(tag: string) {
  gistsStore.togglePinnedTag(tag)
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  dragOverIndex.value = index
}

function handleDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()

  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }

  // Create a new array with the reordered items
  const newOrder = [...pinnedTags.value]
  const [movedItem] = newOrder.splice(draggedIndex.value, 1)
  newOrder.splice(targetIndex, 0, movedItem)

  // Update the store
  gistsStore.reorderPinnedTags(newOrder)

  // Reset drag state
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<style lang="scss" scoped>
.navigation-panel {
  height: 100%;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
}

.tag-item {
  &:hover:not(.q-item--active) {
    background: var(--bg-secondary);
  }
}

:deep(.q-item--active) {
  background: var(--q-primary) !important;
  color: white;

  &:hover {
    background: var(--q-primary) !important;
  }

  .q-icon,
  .q-item-label {
    color: white !important;
  }
}

.pinned-tag-item {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .drag-handle {
    opacity: 0.4;
    transition: opacity 0.2s;
  }

  &:hover .drag-handle {
    opacity: 1;
  }

  &.drag-over {
    border-top: 2px solid var(--q-primary);
    background: var(--bg-secondary);
  }
}

.hidden-drawer-item {
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
    background: var(--bg-secondary);
  }
}

:deep(.section-header-expandable) {
  padding: 4px 16px;
  min-height: 36px;
}
</style>
