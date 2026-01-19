/**
 * GitHub Gist Adapter for Qepton
 * Implements the SnippetServiceAdapter interface for GitHub Gist API
 */

import type {
  SnippetServiceAdapter,
  Snippet,
  SnippetFile,
  SnippetOwner,
  CreateSnippetPayload,
  UpdateSnippetPayload,
  ListSnippetsOptions,
  SnippetVersion,
  ServiceType,
} from '../../core/types';

import { parseDescription, addLangPrefix } from '../../services/parser';

// Re-export types
export type { Snippet, SnippetFile, CreateSnippetPayload, UpdateSnippetPayload };

// GitHub API types
interface GitHubGist {
  id: string;
  description: string | null;
  public: boolean;
  created_at: string;
  updated_at: string;
  html_url: string;
  owner: GitHubUser | null;
  files: Record<string, GitHubGistFile>;
  history?: GitHubGistHistory[];
}

interface GitHubGistFile {
  filename: string;
  type: string;
  language: string | null;
  raw_url: string;
  size: number;
  content?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubGistHistory {
  version: string;
  committed_at: string;
  change_status: {
    deletions: number;
    additions: number;
    total: number;
  };
  user: GitHubUser | null;
}

export class GitHubAdapter implements SnippetServiceAdapter {
  readonly serviceType: ServiceType = 'github';
  readonly serviceName = 'GitHub Gist';

  private token: string | null = null;
  private baseUrl: string;
  private user: SnippetOwner | null = null;

  constructor(options?: { baseUrl?: string }) {
    // In browser, use proxy; in Electron, use direct API
    this.baseUrl = options?.baseUrl || this.getDefaultBaseUrl();
  }

  private getDefaultBaseUrl(): string {
    if (typeof window !== 'undefined' && !window.electronAPI) {
      return '/api/github'; // Proxy in browser mode
    }
    return 'https://api.github.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async authenticate(token: string): Promise<void> {
    this.token = token;
    // Verify token by fetching user
    await this.getCurrentUser();
  }

  logout(): void {
    this.token = null;
    this.user = null;
  }

  async getCurrentUser(): Promise<SnippetOwner | null> {
    if (!this.token) return null;

    try {
      const user = await this.request<GitHubUser>('/user');
      this.user = {
        id: String(user.id),
        username: user.login,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
      };
      return this.user;
    } catch {
      this.token = null;
      return null;
    }
  }

  async listSnippets(options: ListSnippetsOptions = {}): Promise<Snippet[]> {
    const { page = 1, perPage = 30, since } = options;
    let url = `/gists?page=${page}&per_page=${perPage}`;
    if (since) {
      url += `&since=${since}`;
    }

    const gists = await this.request<GitHubGist[]>(url);
    return gists.map(gist => this.transformGist(gist));
  }

  async getSnippet(id: string): Promise<Snippet> {
    const gist = await this.request<GitHubGist>(`/gists/${id}`);
    return this.transformGist(gist);
  }

  async createSnippet(payload: CreateSnippetPayload): Promise<Snippet> {
    const gist = await this.request<GitHubGist>('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: payload.description,
        public: payload.isPublic,
        files: payload.files,
      }),
    });
    return this.transformGist(gist);
  }

  async updateSnippet(id: string, payload: UpdateSnippetPayload): Promise<Snippet> {
    const body: Record<string, unknown> = {};
    if (payload.description !== undefined) {
      body.description = payload.description;
    }
    if (payload.files) {
      body.files = payload.files;
    }

    const gist = await this.request<GitHubGist>(`/gists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return this.transformGist(gist);
  }

  async deleteSnippet(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/gists/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
  }

  async starSnippet(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/gists/${id}/star`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Length': '0',
      },
    });
  }

  async unstarSnippet(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/gists/${id}/star`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
  }

  async isStarred(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/gists/${id}/star`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    return response.status === 204;
  }

  async listStarredSnippets(): Promise<Snippet[]> {
    const gists = await this.request<GitHubGist[]>('/gists/starred');
    return gists.map(gist => this.transformGist(gist));
  }

  async getSnippetHistory(id: string): Promise<SnippetVersion[]> {
    const gist = await this.request<GitHubGist>(`/gists/${id}`);
    if (!gist.history) return [];

    return gist.history.map((h, index) => ({
      id: h.version,
      committedAt: h.committed_at,
      changeType: index === gist.history!.length - 1 ? 'created' : 'updated',
      user: h.user
        ? {
            id: String(h.user.id),
            username: h.user.login,
            avatarUrl: h.user.avatar_url,
          }
        : undefined,
    }));
  }

  async getSnippetVersion(id: string, versionId: string): Promise<Snippet> {
    const gist = await this.request<GitHubGist>(`/gists/${id}/${versionId}`);
    return this.transformGist(gist);
  }

  async forkSnippet(id: string): Promise<Snippet> {
    const gist = await this.request<GitHubGist>(`/gists/${id}/forks`, {
      method: 'POST',
    });
    return this.transformGist(gist);
  }

  async listForks(id: string): Promise<Snippet[]> {
    const gists = await this.request<GitHubGist[]>(`/gists/${id}/forks`);
    return gists.map(gist => this.transformGist(gist));
  }

  private transformGist(gist: GitHubGist): Snippet {
    const files: SnippetFile[] = Object.values(gist.files).map(file => ({
      filename: file.filename,
      content: file.content || '',
      language: file.language || 'text',
      size: file.size,
      rawUrl: file.raw_url,
    }));

    const rawDescription = gist.description || '';
    const parsed = parseDescription(rawDescription);

    // Extract language tags from files
    const languageSet = new Set<string>();
    files.forEach(file => {
      if (file.language && file.language !== 'text') {
        languageSet.add(addLangPrefix(file.language));
      }
    });
    const languageTags = Array.from(languageSet);

    return {
      id: gist.id,
      description: rawDescription,
      files,
      isPublic: gist.public,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      url: gist.html_url,
      owner: gist.owner
        ? {
            id: String(gist.owner.id),
            username: gist.owner.login,
            avatarUrl: gist.owner.avatar_url,
            profileUrl: gist.owner.html_url,
          }
        : {
            id: 'anonymous',
            username: 'anonymous',
          },
      tags: parsed.customTags,
      languageTags,
      serviceType: 'github',
    };
  }
}

// Default export - singleton instance
export const githubAdapter = new GitHubAdapter();
export default githubAdapter;
