/**
 * Meta Composable
 * Provides dynamic page title and meta tag management using Quasar's useMeta
 */

import { useMeta } from 'quasar'
import { computed } from 'vue'
import { useGistsStore } from 'src/stores/gists'
import { useAuthStore } from 'src/stores/auth'
import { parseDescription } from 'src/services/parser'

const APP_NAME = 'Qepton'

export interface MetaOptions {
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
}

/**
 * Set page meta with dynamic title
 */
export function usePageMeta(options: MetaOptions = {}) {
  const title = options.title ? `${options.title} - ${APP_NAME}` : APP_NAME

  useMeta({
    title,
    meta: {
      description: { name: 'description', content: options.description || 'Prompt and Code Snippet Manager' },
      ogTitle: { property: 'og:title', content: options.ogTitle || title },
      ogDescription: {
        property: 'og:description',
        content: options.ogDescription || options.description || ''
      }
    }
  })
}

/**
 * Set dynamic meta based on active gist
 */
export function useGistMeta() {
  const gistsStore = useGistsStore()

  const metaData = computed(() => {
    const gist = gistsStore.activeGist

    if (!gist) {
      return {
        title: APP_NAME,
        description: 'Prompt and Code Snippet Manager'
      }
    }

    const parsed = parseDescription(gist.description)
    const title = parsed.title || gist.description || 'Untitled Gist'
    const fileCount = Object.keys(gist.files || {}).length
    const description = `${fileCount} file${fileCount !== 1 ? 's' : ''} - ${gist.public ? 'Public' : 'Secret'} gist`

    return {
      title: `${title} - ${APP_NAME}`,
      description
    }
  })

  useMeta(() => ({
    title: metaData.value.title,
    meta: {
      description: { name: 'description', content: metaData.value.description }
    }
  }))

  return metaData
}

/**
 * Set meta based on current tag view
 */
export function useTagMeta() {
  const gistsStore = useGistsStore()

  const metaData = computed(() => {
    const tag = gistsStore.activeTag
    const tagInfo = gistsStore.tagInfo(tag)

    if (tag === 'All Gists') {
      return {
        title: `All Gists - ${APP_NAME}`,
        description: `Browse all ${gistsStore.totalGists} gists`
      }
    }

    const count = tagInfo?.count || 0
    const isLanguage = tag.startsWith('lang@')
    const displayTag = isLanguage ? tag.replace('lang@', '') : tag

    return {
      title: `${displayTag} - ${APP_NAME}`,
      description: `${count} gist${count !== 1 ? 's' : ''} tagged with ${displayTag}`
    }
  })

  useMeta(() => ({
    title: metaData.value.title,
    meta: {
      description: { name: 'description', content: metaData.value.description }
    }
  }))

  return metaData
}

/**
 * Set meta for authentication pages
 */
export function useAuthMeta() {
  const authStore = useAuthStore()

  const metaData = computed(() => {
    if (authStore.isAuthenticated) {
      return {
        title: `${authStore.username} - ${APP_NAME}`,
        description: `Logged in as ${authStore.username}`
      }
    }

    return {
      title: `Login - ${APP_NAME}`,
      description: 'Login to access your GitHub Gists'
    }
  })

  useMeta(() => ({
    title: metaData.value.title,
    meta: {
      description: { name: 'description', content: metaData.value.description }
    }
  }))

  return metaData
}

/**
 * Set a simple static page title
 */
export function useSimpleMeta(title: string, description?: string) {
  useMeta({
    title: title ? `${title} - ${APP_NAME}` : APP_NAME,
    meta: {
      description: { name: 'description', content: description || 'Prompt and Code Snippet Manager' }
    }
  })
}
