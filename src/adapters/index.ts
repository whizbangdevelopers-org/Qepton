/**
 * Adapters Index
 * Export all snippet service adapters
 */

export { GitHubAdapter, githubAdapter } from './github';
export { GitLabAdapter, gitlabAdapter } from './gitlab';
export { BitbucketAdapter, bitbucketAdapter } from './bitbucket';

// Re-export types
export type {
  Snippet,
  SnippetFile,
  CreateSnippetPayload,
  UpdateSnippetPayload,
} from './github';

import { githubAdapter } from './github';
import { gitlabAdapter } from './gitlab';
import { bitbucketAdapter } from './bitbucket';
import type { SnippetServiceAdapter, ServiceType } from '../core/types';

/**
 * Get adapter by service type
 */
export function getAdapter(serviceType: ServiceType): SnippetServiceAdapter {
  switch (serviceType) {
    case 'github':
      return githubAdapter;
    case 'gitlab':
      return gitlabAdapter;
    case 'bitbucket':
      return bitbucketAdapter;
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): SnippetServiceAdapter[] {
  return [githubAdapter, gitlabAdapter, bitbucketAdapter];
}

/**
 * Get supported service types
 */
export function getSupportedServices(): ServiceType[] {
  return ['github', 'gitlab', 'bitbucket'];
}
