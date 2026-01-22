# MCP & Tooling Setup

Recommended MCP servers and tooling integrations for the hybrid prompt/agent workflow.

---

## Recommended MCP Stack

### Tier 1: High Value (Set Up First)

#### 1. GitHub MCP Server (Official)
**Purpose:** Full GitHub integration - issues, PRs, Actions, code search across repos

```bash
# Remote setup (easiest - hosted by GitHub)
claude mcp add github --url https://api.githubcopilot.com/mcp

# Or local Docker setup
docker pull ghcr.io/github/github-mcp-server
```

**Key Capabilities:**
| Feature | Use Case |
| ------- | -------- |
| Issue management | Read/create/update issues across whizbangdevelopers repos |
| PR workflows | Create PRs, review, merge |
| Actions monitoring | Check workflow status, get logs, debug failures |
| Code search | Search across Qepton/Qepton-Dev/Qepton-Premium |
| Security alerts | Review Dependabot findings |

**Configuration:**
```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Required Scopes:** `repo`, `read:org`, `workflow`, `read:packages`

---

#### 2. Code Index MCP (Choose One)

**Option A: Claude Context by Zilliz** (Semantic search, cloud-backed)
```bash
# Good for: Large codebases, semantic "find similar code" queries
# Supports: TypeScript, JavaScript, PHP, Vue
npx @anthropic-ai/claude-code mcp add claude-context
```

**Option B: Code-Index-MCP by ViperJuice** (Local-first, fast)
```bash
# Good for: Privacy-sensitive, sub-100ms queries, offline work
# 150K+ file support
npx @anthropic-ai/claude-code mcp add code-index-mcp
```

**Recommendation:** Start with **Code-Index-MCP** for local development. Add Claude Context later if you need cross-repo semantic search.

---

#### 3. Vite Plugin Vue MCP
**Purpose:** Vue/Quasar app introspection - component tree, Pinia state, routes

```bash
npm install -D vite-plugin-vue-mcp
```

```typescript
// vite.config.ts or quasar.config.cjs
import vueMcp from 'vite-plugin-vue-mcp'

export default {
  plugins: [vueMcp()]
}
```

**Capabilities:**
- Component tree visualization
- Pinia store state inspection
- Route analysis
- Helps AI understand app structure at runtime

---

### Tier 2: Backend-Specific (Add Per Project)

#### PHP Projects (WG Admin)
```bash
# php-mcp/server - Framework agnostic
composer require php-mcp/server

# Or if using Laravel later
composer require php-mcp/laravel
```

#### PostgreSQL (Front Accounting)
```bash
# Database MCP for schema introspection and queries
claude mcp add postgres --connection "postgresql://..."
```

---

### Tier 3: Nice to Have

| MCP | Purpose | When to Add |
| --- | ------- | ----------- |
| MCP Language Server | Go-to-definition, find references via LSP | Complex refactoring |
| Filesystem MCP | Sandboxed file operations | Multi-project workflows |
| Docker MCP | Container management | CI/CD debugging |

---

## Skills Integration

Claude Code skills provide reusable command workflows.

### Recommended Skills Setup

#### Built-in Skills
| Skill | Trigger | Purpose |
| ----- | ------- | ------- |
| `/commit` | Commit workflow | Staged changes → commit with message |
| `/review-pr` | PR review | Analyze PR, suggest improvements |

#### Custom Skills to Create

**1. Release Skill** (`/release`)
```yaml
# .claude/skills/release.yaml
name: release
description: Bump version and release to target repos
triggers:
  - /release
  - /rel
steps:
  - Analyze changes since last tag
  - Suggest version bump (patch/minor/major)
  - Run npm version
  - Push with tags
  - Optionally run release-to.sh
```

**2. Issue Triage Skill** (`/triage`)
```yaml
# .claude/skills/triage.yaml
name: triage
description: Analyze and categorize open issues
triggers:
  - /triage
steps:
  - Fetch open issues via GitHub MCP
  - Categorize by type (bug/feature/improvement)
  - Suggest priorities
  - Create summary
```

**3. Store Generator Skill** (`/store`)
```yaml
# .claude/skills/store.yaml
name: store
description: Generate Pinia store following project patterns
triggers:
  - /store
parameters:
  - name: feature name
steps:
  - Read src/stores/gists.ts as template
  - Generate new store with:
    - Typed state interface
    - Getters
    - Actions
    - Persistence config
  - Create test file stub
```

**4. Component Generator Skill** (`/component`)
```yaml
# .claude/skills/component.yaml
name: component
description: Generate Vue component following project patterns
triggers:
  - /component
parameters:
  - type: dialog|panel|page
  - name: component name
steps:
  - Read similar component as template
  - Generate with Quasar components, composition API
  - Add to appropriate directory
```

---

## Configuration Files

### Project-Level MCP (`.mcp.json`)
Shared across team, checked into repo:
```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp"
    },
    "vue-mcp": {
      "command": "npx",
      "args": ["vite-plugin-vue-mcp", "--serve"]
    }
  }
}
```

### User-Level MCP (`~/.claude/mcp.json`)
Personal tokens, not checked in:
```json
{
  "mcpServers": {
    "github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

---

## Zencoder Workflows

If using Zencoder, place workflow configs in `.zencoder/workflows/`:

```yaml
# .zencoder/workflows/quasar-component.yaml
name: quasar-component
description: Generate Quasar Vue component
context:
  - src/components/**/*.vue
  - CLAUDE.md
prompt: |
  Generate a Quasar Vue 3 component using:
  - <script setup lang="ts">
  - Composition API
  - Quasar components from the q- namespace
  - Following patterns in existing components
```

---

## Rollout Plan

### Phase 1: GitHub MCP (This Week)
1. Set up GitHub MCP (remote hosted)
2. Test with issue listing, PR creation
3. Document value/friction in WORKFLOW-PATTERNS.md

### Phase 2: Code Indexing (Next)
1. Add Code-Index-MCP
2. Test codebase search vs. native Grep/Glob
3. Assess if it improves context for large tasks

### Phase 3: Vue MCP (With Quasar Dev)
1. Add vite-plugin-vue-mcp
2. Test during active Quasar development
3. Evaluate runtime introspection value

### Phase 4: Custom Skills
1. Create /release skill
2. Create /store and /component generators
3. Refine based on usage

---

## Measuring Value

Track for each MCP/skill:

| Metric | How to Measure |
| ------ | -------------- |
| Time saved | Compare task duration with/without |
| Context accuracy | Did AI understand codebase better? |
| Error reduction | Fewer iterations to correct result |
| Adoption | Do you actually use it regularly? |

Log assessments in [WORKFLOW-PATTERNS.md](./WORKFLOW-PATTERNS.md) under MCP & Skills Integration Notes.
