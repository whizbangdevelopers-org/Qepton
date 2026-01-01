/**
 * Export Plugin - Basic export functionality (free tier)
 * Allows exporting snippets to various formats
 */

import type { QeptonPlugin, QeptonApp, Snippet } from '../../core/types';

interface ExportOptions {
  format: 'json' | 'markdown' | 'zip';
  includeMetadata: boolean;
}

export const exportPlugin: QeptonPlugin = {
  id: 'qepton-export',
  name: 'Export',
  version: '1.0.0',
  description: 'Export snippets to JSON, Markdown, or ZIP formats',
  author: 'Qepton Team',

  install(app: QeptonApp) {
    // Register export commands
    app.registerCommand({
      id: 'export:json',
      label: 'Export as JSON',
      icon: 'mdi-code-json',
      shortcut: 'Ctrl+Shift+E',
      execute: async () => {
        const uiStore = app.getStore<{ selectedSnippet: Snippet | null }>('ui');
        if (uiStore.selectedSnippet) {
          await exportAsJSON(uiStore.selectedSnippet);
        }
      },
    });

    app.registerCommand({
      id: 'export:markdown',
      label: 'Export as Markdown',
      icon: 'mdi-language-markdown',
      execute: async () => {
        const uiStore = app.getStore<{ selectedSnippet: Snippet | null }>('ui');
        if (uiStore.selectedSnippet) {
          await exportAsMarkdown(uiStore.selectedSnippet);
        }
      },
    });

    app.registerCommand({
      id: 'export:all',
      label: 'Export All Snippets',
      icon: 'mdi-download-multiple',
      execute: async () => {
        const gistsStore = app.getStore<{ snippets: Snippet[] }>('gists');
        await exportAllAsZip(gistsStore.snippets);
      },
    });
  },
};

async function exportAsJSON(snippet: Snippet): Promise<void> {
  const data = JSON.stringify(snippet, null, 2);
  downloadFile(
    data,
    `${sanitizeFilename(snippet.description || snippet.id)}.json`,
    'application/json'
  );
}

async function exportAsMarkdown(snippet: Snippet): Promise<void> {
  let markdown = `# ${snippet.description || 'Untitled Snippet'}\n\n`;
  markdown += `**Created:** ${new Date(snippet.createdAt).toLocaleDateString()}\n`;
  markdown += `**Updated:** ${new Date(snippet.updatedAt).toLocaleDateString()}\n`;

  if (snippet.tags.length > 0) {
    markdown += `**Tags:** ${snippet.tags.join(', ')}\n`;
  }

  markdown += '\n---\n\n';

  for (const file of snippet.files) {
    markdown += `## ${file.filename}\n\n`;
    markdown += `\`\`\`${file.language.toLowerCase()}\n`;
    markdown += file.content;
    markdown += '\n```\n\n';
  }

  downloadFile(
    markdown,
    `${sanitizeFilename(snippet.description || snippet.id)}.md`,
    'text/markdown'
  );
}

async function exportAllAsZip(snippets: Snippet[]): Promise<void> {
  // For the basic plugin, we just export as a large JSON file
  // Premium version would include proper ZIP with individual files
  const data = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: snippets.length,
      snippets,
    },
    null,
    2
  );

  downloadFile(data, `qepton-export-${Date.now()}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) || 'snippet';
}

export default exportPlugin;
