import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('axios', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
  return {
    default: {
      create: vi.fn(() => mockClient)
    }
  }
})

import axios from 'axios'
import { GitHubAPIService } from 'src/services/github-api'

describe('GitHub API Service', () => {
  let api: GitHubAPIService
  let mockClient: ReturnType<typeof axios.create>

  beforeEach(() => {
    vi.clearAllMocks()
    api = new GitHubAPIService()
    mockClient = axios.create()
    api.setToken('test-token')
  })

  describe('cloneGist', () => {
    const mockSourceGist = {
      id: 'source-gist-123',
      description: 'Test Gist #test',
      public: true,
      files: {
        'test.js': {
          filename: 'test.js',
          content: 'console.log("hello")',
          language: 'JavaScript'
        },
        'readme.md': {
          filename: 'readme.md',
          content: '# README',
          language: 'Markdown'
        }
      },
      owner: { login: 'testuser' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const mockNewGist = {
      id: 'new-gist-456',
      description: 'Test Gist #test',
      public: false,
      files: mockSourceGist.files,
      owner: { login: 'testuser' },
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }

    it('should fetch source gist and create new gist with opposite visibility', async () => {
      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockSourceGist
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockNewGist
      })

      const result = await api.cloneGist('source-gist-123', 'private')

      expect(mockClient.get).toHaveBeenCalledWith('/gists/source-gist-123')
      expect(mockClient.post).toHaveBeenCalledWith('/gists', {
        description: 'Test Gist #test',
        public: false,
        files: {
          'test.js': { content: 'console.log("hello")' },
          'readme.md': { content: '# README' }
        }
      })
      expect(result.id).toBe('new-gist-456')
      expect(result.public).toBe(false)
    })

    it('should clone private gist as public', async () => {
      const privateGist = { ...mockSourceGist, public: false }
      const publicClone = { ...mockNewGist, public: true }

      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: privateGist
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: publicClone
      })

      const result = await api.cloneGist('source-gist-123', 'public')

      expect(mockClient.post).toHaveBeenCalledWith('/gists', {
        description: 'Test Gist #test',
        public: true,
        files: {
          'test.js': { content: 'console.log("hello")' },
          'readme.md': { content: '# README' }
        }
      })
      expect(result.public).toBe(true)
    })

    it('should preserve all files when cloning', async () => {
      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockSourceGist
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockNewGist
      })

      await api.cloneGist('source-gist-123', 'private')

      const postCall = (mockClient.post as ReturnType<typeof vi.fn>).mock.calls[0]
      const filesArg = postCall[1].files

      expect(Object.keys(filesArg)).toHaveLength(2)
      expect(filesArg['test.js'].content).toBe('console.log("hello")')
      expect(filesArg['readme.md'].content).toBe('# README')
    })

    it('should preserve description when cloning', async () => {
      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockSourceGist
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockNewGist
      })

      await api.cloneGist('source-gist-123', 'private')

      const postCall = (mockClient.post as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(postCall[1].description).toBe('Test Gist #test')
    })

    it('should handle empty description', async () => {
      const gistNoDesc = { ...mockSourceGist, description: null }

      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: gistNoDesc
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { ...mockNewGist, description: '' }
      })

      await api.cloneGist('source-gist-123', 'private')

      const postCall = (mockClient.post as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(postCall[1].description).toBe('')
    })

    it('should skip files without content', async () => {
      const gistWithEmptyFile = {
        ...mockSourceGist,
        files: {
          'test.js': { filename: 'test.js', content: 'console.log("hello")' },
          'empty.txt': { filename: 'empty.txt', content: null }
        }
      }

      ;(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: gistWithEmptyFile
      })
      ;(mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: mockNewGist
      })

      await api.cloneGist('source-gist-123', 'private')

      const postCall = (mockClient.post as ReturnType<typeof vi.fn>).mock.calls[0]
      const filesArg = postCall[1].files

      expect(Object.keys(filesArg)).toHaveLength(1)
      expect(filesArg['test.js']).toBeDefined()
      expect(filesArg['empty.txt']).toBeUndefined()
    })
  })
})
