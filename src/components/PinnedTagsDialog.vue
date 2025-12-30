<template>
  <q-dialog
    :model-value="uiStore.modals.pinnedTags"
    @update:model-value="handleClose"
    data-test="pinned-tags-dialog"
  >
    <q-card class="pinned-tags-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Manage Pinned Tags</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="filter"
          placeholder="Filter tags..."
          outlined
          dense
          clearable
          class="q-mb-md"
          data-test="tag-filter"
        >
          <template #prepend>
            <q-icon name="filter_list" />
          </template>
        </q-input>

        <div class="text-subtitle2 q-mb-sm">Pinned Tags</div>
        <q-list v-if="gistsStore.pinnedTags.length > 0" dense bordered class="rounded-borders q-mb-md">
          <q-item
            v-for="tag in gistsStore.pinnedTags"
            :key="tag"
            clickable
            @click="gistsStore.unpinTag(tag)"
          >
            <q-item-section avatar>
              <q-icon
                :name="tag.startsWith('lang@') ? 'code' : 'label'"
                color="primary"
                size="sm"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ formatTagName(tag) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="push_pin" color="primary" size="sm" />
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="text-grey q-mb-md">No pinned tags</div>

        <div class="text-subtitle2 q-mb-sm">Available Tags</div>
        <q-list dense bordered class="rounded-borders available-tags">
          <q-item
            v-for="tag in filteredTags"
            :key="tag"
            clickable
            @click="gistsStore.pinTag(tag)"
          >
            <q-item-section avatar>
              <q-icon
                :name="tag.startsWith('lang@') ? 'code' : 'label'"
                :color="tag.startsWith('lang@') ? 'accent' : 'secondary'"
                size="sm"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ formatTagName(tag) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge :label="getTagCount(tag)" />
            </q-item-section>
          </q-item>
          <q-item v-if="filteredTags.length === 0">
            <q-item-section class="text-grey text-center">
              {{ filter ? 'No matching tags' : 'No available tags' }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'

const uiStore = useUIStore()
const gistsStore = useGistsStore()

const filter = ref('')

const filteredTags = computed(() => {
  const allTags = gistsStore.allTags.filter(
    tag => !gistsStore.pinnedTags.includes(tag)
  )

  if (!filter.value) return allTags

  const lowerFilter = filter.value.toLowerCase()
  return allTags.filter(tag =>
    formatTagName(tag).toLowerCase().includes(lowerFilter)
  )
})

function formatTagName(tag: string): string {
  return tag.startsWith('lang@') ? tag.replace('lang@', '') : tag
}

function getTagCount(tag: string): number {
  const info = gistsStore.tagInfo(tag)
  return info?.count || 0
}

function handleClose() {
  uiStore.closeModal('pinnedTags')
  filter.value = ''
}
</script>

<style lang="scss" scoped>
.pinned-tags-dialog {
  min-width: 350px;
  max-width: 450px;
}

.available-tags {
  max-height: 300px;
  overflow-y: auto;
}
</style>
