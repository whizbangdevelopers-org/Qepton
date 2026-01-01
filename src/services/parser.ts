/**
 * Parser Service
 * Parses gist descriptions to extract titles, tags, and language information
 * Supports both Legacy (#tags: tag1, tag2) and Twitter (#tag1 #tag2) style tags
 */

import twitter from 'twitter-text'
import type { Gist } from 'src/types/github'

export interface ParsedDescription {
  title: string
  description: string
  customTags: string[]
  tagStyle: 'legacy' | 'twitter' | 'none'
}

/**
 * Parse gist description to extract title, description, and custom tags
 *
 * Supported formats:
 * - Legacy: [title] description #tags: tag1, tag2, tag3
 * - Twitter: [title] description #tag1 #tag2 #tag3
 *
 * @param rawDescription - The raw gist description string
 * @returns Parsed components
 */
export function parseDescription(rawDescription: string | null | undefined): ParsedDescription {
  const description = rawDescription || 'No description'

  // Extract title from [brackets]
  const titleMatch = description.match(/\[.*?\]/)
  const rawTitle = titleMatch ? titleMatch[0] : ''
  const title = rawTitle.length > 0 ? rawTitle.substring(1, rawTitle.length - 1) : ''

  // Try parsing custom tags in legacy format first
  let customTags = parseCustomTagsFromLegacy(description)
  let tagStyle: 'legacy' | 'twitter' | 'none' = 'legacy'

  // If no legacy tags found, try Twitter hashtag format
  if (customTags.length === 0) {
    customTags = parseCustomTagsFromTwitter(description)
    tagStyle = customTags.length > 0 ? 'twitter' : 'none'
  }

  // Extract clean description (remove title and tags)
  let cleanDescription = description.substring(rawTitle.length).trim()

  if (tagStyle === 'legacy') {
    const tagsLength = extractLegacyTagsString(description).length
    cleanDescription = description
      .substring(rawTitle.length, description.length - tagsLength)
      .trim()
  } else if (tagStyle === 'twitter') {
    cleanDescription = cleanDescription.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()
  }

  return {
    title,
    description: cleanDescription,
    customTags,
    tagStyle
  }
}

/**
 * Parse custom tags from legacy format: #tags: tag1, tag2, tag3
 */
function parseCustomTagsFromLegacy(description: string): string[] {
  const legacyTagsString = extractLegacyTagsString(description)

  if (!legacyTagsString) {
    return []
  }

  const prefix = '#tags:'
  if (!legacyTagsString.trim().startsWith(prefix)) {
    return []
  }

  const tagsContent = legacyTagsString.trim().substring(prefix.length)

  // Split by comma, Chinese comma, or Japanese separator
  const tags = tagsContent
    .split(/[,，、]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  return tags
}

/**
 * Extract legacy tags string from description
 */
function extractLegacyTagsString(description: string): string {
  const match = description.match(/#tags:.*$/)
  return match ? match[0] : ''
}

/**
 * Parse custom tags from Twitter hashtag format: #tag1 #tag2 #tag3
 */
function parseCustomTagsFromTwitter(description: string): string[] {
  const hashtags = twitter.extractHashtags(description)
  return hashtags
}

/**
 * Add language prefix to create a language tag
 *
 * @param language - Language name (e.g., "JavaScript")
 * @returns Prefixed language tag (e.g., "lang@JavaScript")
 */
export function addLangPrefix(language: string | null | undefined): string {
  const lang = language || 'Other'
  const prefix = 'lang@'

  return lang.trim().length > 0 ? prefix + lang.trim() : prefix + 'Other'
}

/**
 * Parse language name from a language tag
 *
 * @param langTag - Language tag (e.g., "lang@JavaScript")
 * @returns Language name (e.g., "JavaScript")
 */
export function parseLangName(langTag: string): string {
  const prefix = 'lang@'

  if (!langTag.startsWith(prefix)) {
    return langTag
  }

  return langTag.substring(prefix.length)
}

/**
 * Extract all language tags from a gist
 *
 * @param gist - The gist object
 * @returns Array of language tags (e.g., ["lang@JavaScript", "lang@CSS"])
 */
export function extractLanguageTags(gist: Gist): string[] {
  const languages = new Set<string>()

  const files = gist.files || {}
  Object.values(files).forEach(file => {
    if (file.language) {
      languages.add(addLangPrefix(file.language))
    }
  })

  // If no languages found, add "Other"
  if (languages.size === 0) {
    languages.add(addLangPrefix('Other'))
  }

  return Array.from(languages)
}

/**
 * Extract all custom tags from a gist's description
 *
 * @param gist - The gist object
 * @returns Array of custom tags
 */
export function extractCustomTags(gist: Gist): string[] {
  const parsed = parseDescription(gist.description)
  return parsed.customTags
}

/**
 * Extract all tags (language + custom) from a gist
 *
 * @param gist - The gist object
 * @returns Object with language tags and custom tags
 */
export function extractAllTags(gist: Gist): { languageTags: string[]; customTags: string[] } {
  return {
    languageTags: extractLanguageTags(gist),
    customTags: extractCustomTags(gist)
  }
}

/**
 * Format tags for display (add # prefix to custom tags if missing)
 *
 * @param tag - Tag string
 * @returns Formatted tag
 */
export function formatTagForDisplay(tag: string): string {
  if (tag.startsWith('lang@')) {
    return parseLangName(tag)
  }

  if (tag.startsWith('#')) {
    return tag
  }

  return `#${tag}`
}

/**
 * Create a description string from components (for saving gists)
 *
 * @param title - Optional title
 * @param description - Description text
 * @param customTags - Array of custom tags
 * @param style - Tag style to use
 * @returns Formatted description string
 */
export function buildDescription(
  title: string,
  description: string,
  customTags: string[] = [],
  style: 'legacy' | 'twitter' = 'twitter'
): string {
  let result = ''

  // Add title in brackets if provided
  if (title && title.trim().length > 0) {
    result += `[${title.trim()}] `
  }

  // Add description
  result += description.trim()

  // Add tags if any
  if (customTags.length > 0) {
    if (style === 'legacy') {
      result += ` #tags: ${customTags.join(', ')}`
    } else {
      result += ' ' + customTags.map(tag => `#${tag}`).join(' ')
    }
  }

  return result.trim()
}
