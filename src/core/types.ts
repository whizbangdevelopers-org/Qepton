/**
 * Core types for Qepton - Multi-platform code snippet manager
 * These types define the abstraction layer for supporting multiple git services
 */

// Base snippet representation (abstracted from GitHub Gist)
export interface Snippet {
  id: string;
  description: string;
  files: SnippetFile[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  owner: SnippetOwner;
  url: string;
  tags: string[];
  languageTags: string[];
  // Service-specific metadata
  serviceType: ServiceType;
  serviceData?: Record<string, unknown>;
}

export interface SnippetFile {
  filename: string;
  content: string;
  language: string;
  size: number;
  rawUrl?: string;
}

export interface SnippetOwner {
  id: string;
  username: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export type ServiceType = 'github' | 'gitlab' | 'bitbucket' | 'gitea' | 'forgejo';

// Create/Update payloads
export interface CreateSnippetPayload {
  description: string;
  files: Record<string, { content: string }>;
  isPublic: boolean;
}

export interface UpdateSnippetPayload {
  description?: string;
  files?: Record<string, { content: string } | null>; // null = delete file
}

// Adapter interface - each service implements this
export interface SnippetServiceAdapter {
  readonly serviceType: ServiceType;
  readonly serviceName: string;

  // Authentication
  isAuthenticated(): boolean;
  authenticate(token: string): Promise<void>;
  logout(): void;
  getCurrentUser(): Promise<SnippetOwner | null>;

  // CRUD operations
  listSnippets(options?: ListSnippetsOptions): Promise<Snippet[]>;
  getSnippet(id: string): Promise<Snippet>;
  createSnippet(payload: CreateSnippetPayload): Promise<Snippet>;
  updateSnippet(id: string, payload: UpdateSnippetPayload): Promise<Snippet>;
  deleteSnippet(id: string): Promise<void>;

  // Starring/favorites (if supported)
  starSnippet?(id: string): Promise<void>;
  unstarSnippet?(id: string): Promise<void>;
  isStarred?(id: string): Promise<boolean>;
  listStarredSnippets?(): Promise<Snippet[]>;

  // History/versions (if supported)
  getSnippetHistory?(id: string): Promise<SnippetVersion[]>;
  getSnippetVersion?(id: string, versionId: string): Promise<Snippet>;

  // Forking (if supported)
  forkSnippet?(id: string): Promise<Snippet>;
  listForks?(id: string): Promise<Snippet[]>;
}

export interface ListSnippetsOptions {
  page?: number;
  perPage?: number;
  since?: string; // ISO date string
}

export interface SnippetVersion {
  id: string;
  committedAt: string;
  changeType: 'created' | 'updated';
  user?: SnippetOwner;
}
