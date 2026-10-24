// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.

/**
 * An update's release notes as the layout shows them (`MainLayout.vue`, inserted with v-html).
 *
 * electron-updater's GitHub provider takes them from the releases Atom feed's `<content>`
 * (`computeReleaseNotes` in `electron-updater/out/providers/GitHubProvider.js`): HTML that GitHub
 * rendered from the release's body. Notes written as Markdown get the few headings, lists, bold
 * and code a release body uses. Either way the result is sanitized last, keeping its markup and
 * losing script and handlers, as a notebook's `text/html` output is (`jupyter.ts`). Until
 * 2026-10-24 this formatting lived in the layout and went into the page unsanitized.
 */

import DOMPurify from 'dompurify'

export function releaseNotesHtml(notes: string | null | undefined): string {
  if (!notes) return ''
  const formatted = notes
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
  return DOMPurify.sanitize(formatted, { USE_PROFILES: { html: true } })
}
