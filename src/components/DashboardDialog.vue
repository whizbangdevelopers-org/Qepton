<template>
  <q-dialog
    :model-value="uiStore.modals.dashboard"
    @update:model-value="handleClose"
    data-test="dashboard-dialog"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="dashboard-dialog">
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="dashboard" size="sm" class="q-mr-sm" />
        <div class="text-h6">Dashboard</div>
        <q-space />
        <div class="text-caption q-mr-md">
          <span v-if="gistsStore.lastSyncTime">
            Last synced {{ formatDate(gistsStore.lastSyncTime) }}
          </span>
          <span v-else>Never synced</span>
        </div>
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section class="dashboard-content">
        <!-- Stats Grid -->
        <div class="stats-grid q-mb-lg">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <q-icon name="code" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalGists }}</div>
              <div class="stat-label">Total Gists</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bg-secondary">
              <q-icon name="translate" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.languageTags }}</div>
              <div class="stat-label">Languages</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bg-accent">
              <q-icon name="label" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.customTags }}</div>
              <div class="stat-label">Custom Tags</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bg-amber">
              <q-icon name="star" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ gistsStore.starredCount }}</div>
              <div class="stat-label">Starred</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bg-info">
              <q-icon name="insert_drive_file" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalFiles }}</div>
              <div class="stat-label">Total Files</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bg-positive">
              <q-icon name="public" color="white" size="sm" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ publicGists }} / {{ privateGists }}</div>
              <div class="stat-label">Public / Private</div>
            </div>
          </div>
        </div>

        <div class="row q-col-gutter-lg">
          <!-- Left Column -->
          <div class="col-12 col-md-6">
            <!-- Activity Chart -->
            <q-card flat bordered class="dashboard-card q-mb-md">
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="show_chart" size="sm" class="q-mr-sm text-primary" />
                  <div class="text-subtitle1 text-weight-medium">Gist Activity (12 months)</div>
                </div>
                <div class="activity-chart">
                  <div class="chart-bars">
                    <div
                      v-for="(month, index) in activityData"
                      :key="index"
                      class="chart-bar-container"
                    >
                      <div
                        class="chart-bar"
                        :style="{ height: `${month.height}%` }"
                        :class="{ 'current-month': index === activityData.length - 1 }"
                      >
                        <q-tooltip>{{ month.label }}: {{ month.count }} gists</q-tooltip>
                      </div>
                      <div class="chart-label">{{ month.shortLabel }}</div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- Top Languages -->
            <q-card flat bordered class="dashboard-card">
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="code" size="sm" class="q-mr-sm text-secondary" />
                  <div class="text-subtitle1 text-weight-medium">Top Languages</div>
                </div>
                <div v-if="topLanguages.length > 0" class="language-bars">
                  <div
                    v-for="lang in topLanguages"
                    :key="lang.name"
                    class="language-bar-row"
                  >
                    <div class="language-name">{{ lang.displayName }}</div>
                    <div class="language-bar-container">
                      <div
                        class="language-bar"
                        :style="{ width: `${lang.percentage}%` }"
                      ></div>
                    </div>
                    <div class="language-count">{{ lang.count }}</div>
                  </div>
                </div>
                <div v-else class="text-grey-6 text-center q-py-md">
                  No languages found
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column -->
          <div class="col-12 col-md-6">
            <!-- Most Used Tags -->
            <q-card flat bordered class="dashboard-card q-mb-md">
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="label" size="sm" class="q-mr-sm text-accent" />
                  <div class="text-subtitle1 text-weight-medium">Most Used Tags</div>
                </div>
                <div v-if="topTags.length > 0" class="tags-cloud">
                  <q-chip
                    v-for="tag in topTags"
                    :key="tag.name"
                    clickable
                    color="primary"
                    text-color="white"
                    size="sm"
                    @click="navigateToTag(tag.name)"
                  >
                    {{ tag.displayName }}
                    <q-badge floating color="white" text-color="primary">
                      {{ tag.count }}
                    </q-badge>
                  </q-chip>
                </div>
                <div v-else class="text-grey-6 text-center q-py-md">
                  No custom tags found
                </div>
              </q-card-section>
            </q-card>

            <!-- Recent Activity -->
            <q-card flat bordered class="dashboard-card">
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="history" size="sm" class="q-mr-sm text-info" />
                  <div class="text-subtitle1 text-weight-medium">Recently Updated</div>
                </div>
                <q-list v-if="recentGists.length > 0" dense class="recent-list">
                  <q-item
                    v-for="gist in recentGists"
                    :key="gist.id"
                    clickable
                    @click="selectGist(gist)"
                    class="recent-item"
                  >
                    <q-item-section avatar>
                      <q-icon
                        :name="gist.public ? 'public' : 'lock'"
                        :color="gist.public ? 'positive' : 'warning'"
                        size="xs"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label lines="1">{{ getGistTitle(gist) }}</q-item-label>
                      <q-item-label caption>
                        {{ formatDate(new Date(gist.updated_at).getTime()) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge color="grey-6" :label="Object.keys(gist.files).length" />
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="text-grey-6 text-center q-py-md">
                  No recent activity
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import { parseDescription } from 'src/services/parser'
import type { Gist } from 'src/types/github'

const uiStore = useUIStore()
const gistsStore = useGistsStore()

const stats = computed(() => gistsStore.stats)

const totalFiles = computed(() => {
  return Object.values(gistsStore.gists).reduce((total, gist) => {
    return total + Object.keys(gist.files).length
  }, 0)
})

const publicGists = computed(() => {
  return Object.values(gistsStore.gists).filter(g => g.public).length
})

const privateGists = computed(() => {
  return Object.values(gistsStore.gists).filter(g => !g.public).length
})

const topLanguages = computed(() => {
  const langTags = gistsStore.languageTags
  const items = langTags
    .map(tag => {
      const info = gistsStore.tagInfo(tag)
      return {
        name: tag,
        displayName: tag.replace('lang@', ''),
        count: info?.count || 0
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const maxCount = items[0]?.count || 1
  return items.map(item => ({
    ...item,
    percentage: (item.count / maxCount) * 100
  }))
})

const topTags = computed(() => {
  const customTags = gistsStore.customTags
  return customTags
    .map(tag => {
      const info = gistsStore.tagInfo(tag)
      return {
        name: tag,
        displayName: tag.replace('#', ''),
        count: info?.count || 0
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

const recentGists = computed(() => {
  return Object.values(gistsStore.gists)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8)
})

const activityData = computed(() => {
  const gists = Object.values(gistsStore.gists)
  const now = new Date()
  const months: { [key: string]: number } = {}

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months[key] = 0
  }

  gists.forEach(gist => {
    const date = new Date(gist.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (key in months) {
      months[key]++
    }
  })

  const maxCount = Math.max(...Object.values(months), 1)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return Object.entries(months).map(([key, count]) => {
    const [year, month] = key.split('-')
    const monthIndex = parseInt(month) - 1
    return {
      label: `${monthNames[monthIndex]} ${year}`,
      shortLabel: monthNames[monthIndex],
      count,
      height: (count / maxCount) * 100
    }
  })
})

function handleClose() {
  uiStore.closeModal('dashboard')
}

function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function getGistTitle(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.title || Object.keys(gist.files)[0] || 'Untitled'
}

function navigateToTag(tag: string) {
  gistsStore.setActiveTag(tag)
  handleClose()
}

function selectGist(gist: Gist) {
  gistsStore.setActiveTag('All Gists')
  gistsStore.setActiveGist(gist.id)
  handleClose()
}
</script>

<style lang="scss" scoped>
.dashboard-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.dashboard-card {
  background: var(--bg-primary);
  border-radius: 12px;
}

.activity-chart {
  height: 120px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  gap: 4px;
}

.chart-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.chart-bar {
  width: 100%;
  max-width: 24px;
  background: var(--q-primary);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: auto;

  &:hover {
    opacity: 0.8;
  }

  &.current-month {
    background: var(--q-secondary);
  }
}

.chart-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.language-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.language-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-name {
  width: 80px;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.language-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.language-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--q-primary), var(--q-secondary));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.language-count {
  width: 30px;
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-list {
  margin: 0 -16px;
}

.recent-item {
  border-radius: 8px;
  margin: 0 8px;

  &:hover {
    background: var(--bg-secondary);
  }
}
</style>
