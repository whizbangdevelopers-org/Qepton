<template>
  <q-dialog
    :model-value="uiStore.modals.dashboard"
    @update:model-value="handleClose"
    data-test="dashboard-dialog"
  >
    <q-card class="dashboard-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Dashboard</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section class="text-center">
                <div class="text-h3 text-primary">{{ stats.totalGists }}</div>
                <div class="text-caption text-grey">Total Gists</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section class="text-center">
                <div class="text-h3 text-secondary">{{ stats.totalTags }}</div>
                <div class="text-caption text-grey">Total Tags</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section class="text-center">
                <div class="text-h3 text-accent">{{ stats.languageTags }}</div>
                <div class="text-caption text-grey">Languages</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6">
            <q-card flat bordered class="stat-card">
              <q-card-section class="text-center">
                <div class="text-h3 text-info">{{ stats.customTags }}</div>
                <div class="text-caption text-grey">Custom Tags</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Top Languages</div>
        <q-list dense>
          <q-item v-for="lang in topLanguages" :key="lang.name">
            <q-item-section avatar>
              <q-icon name="code" color="primary" size="sm" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ lang.displayName }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge color="primary" :label="lang.count" />
            </q-item-section>
          </q-item>
          <q-item v-if="topLanguages.length === 0">
            <q-item-section class="text-grey">No languages found</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-caption text-grey">
        <div v-if="gistsStore.lastSyncTime">
          Last synced: {{ formatDate(gistsStore.lastSyncTime) }}
        </div>
        <div v-else>Never synced</div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import moment from 'moment'

const uiStore = useUIStore()
const gistsStore = useGistsStore()

const stats = computed(() => gistsStore.stats)

const topLanguages = computed(() => {
  const langTags = gistsStore.languageTags
  return langTags
    .map(tag => {
      const info = gistsStore.tagInfo(tag)
      return {
        name: tag,
        displayName: tag.replace('lang@', ''),
        count: info?.count || 0
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

function handleClose() {
  uiStore.closeModal('dashboard')
}

function formatDate(timestamp: number): string {
  return moment(timestamp).fromNow()
}
</script>

<style lang="scss" scoped>
.dashboard-dialog {
  min-width: 350px;
  max-width: 450px;
}

.stat-card {
  background: var(--bg-secondary);
}
</style>
