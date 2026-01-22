# Project Issues & Roadmap Structure

This document defines how issues are organized in the Qepton Roadmap project.

## Parent Issue Types

All work is organized under parent issues. There are two types:

| Type | Label | Purpose | Example |
| ---- | ----- | ------- | ------- |
| **Release** | `release` | Versioned deliverables with acceptance criteria | Release v1.1.0 - Internal Packaging |
| **Track** | `track` | Ongoing work streams without version numbers | Track: Premium Features |

## Current Parent Issues

### Releases (Versioned)

| Issue | Title | Sub-issues | Milestone |
| ----- | ----- | ---------- | --------- |
| #108 | Release v1.1.0 - Internal Packaging | 6 | v1.1.0 |
| #109 | Release v1.2.0 - Linux Packaging | 5 | v1.2.0 |
| #110 | Release v1.3.0 - Advanced Packaging | 4 | v1.3.0 |
| #111 | Release v2.0.0 - OAuth & Multi-Provider | 7 | v2.0.0 |
| #117 | Release v1.4.0 - Notebook Format Support | 4 | v1.4.0 |

### Tracks (Ongoing)

| Issue | Title | Sub-issues |
| ----- | ----- | ---------- |
| #112 | Track: Testing Infrastructure | 9 |
| #113 | Track: Plugin System | 2 |
| #114 | Track: Infrastructure & Maintenance | 5 |
| #115 | Track: Marketing & Launch | 9 |
| #116 | Track: Premium Features | 10 |

## Project Board Views

GitHub Projects API does not support creating views programmatically. Create these views manually in the UI.

### View Tab Order (Left to Right)

| # | View Name | Filter | Purpose |
| - | --------- | ------ | ------- |
| 1 | **Releases** | `label:release` | Versioned releases only |
| 2 | **v1.1.0** | `label:release milestone:v1.1.0` OR sub-issues of #108 | Internal Packaging |
| 3 | **v1.2.0** | `label:release milestone:v1.2.0` OR sub-issues of #109 | Linux Packaging |
| 4 | **v1.3.0** | `label:release milestone:v1.3.0` OR sub-issues of #110 | Advanced Packaging |
| 5 | **v1.4.0** | `label:release milestone:v1.4.0` OR sub-issues of #117 | Notebook Support |
| 6 | **v2.0.0** | `label:release milestone:v2.0.0` OR sub-issues of #111 | OAuth & Multi-Provider |
| 7 | **Testing** | sub-issues of #112 | Testing Infrastructure |
| 8 | **Plugins** | sub-issues of #113 | Plugin System |
| 9 | **Infra** | sub-issues of #114 | Infrastructure & Maintenance |
| 10 | **Marketing** | sub-issues of #115 | Marketing & Launch |
| 11 | **Premium** | sub-issues of #116 | Premium Features |
| 12 | **All Issues** | (no filter) | Everything with hierarchy |

### Step-by-Step View Creation

Go to [Qepton Roadmap Project](https://github.com/orgs/whizbangdevelopers-org/projects/1)

#### 1. Releases View (make this first/default)

1. Click `+ New view` (or rename existing view)
2. Name: `Releases`
3. Click filter icon (funnel)
4. Type: `label:release`
5. Press Enter
6. Drag this tab to be first

#### 2-6. Individual Release Views

For each release (v1.1.0, v1.2.0, v1.3.0, v1.4.0, v2.0.0):

1. Click `+ New view`
2. Name: `v1.1.0` (or appropriate version)
3. Filter option A (by milestone): `milestone:v1.1.0`
4. Filter option B (by parent): Use Hierarchy layout, expand only that parent
5. Save

#### 7-11. Track Views

For each track:

1. Click `+ New view`
2. Name: `Testing` (or `Plugins`, `Infra`, `Marketing`, `Premium`)
3. Filter: Use Hierarchy layout grouped by parent, or filter by specific issue numbers

**Track filter examples:**
- Testing: Issues #26-34 (sub-issues of #112)
- Plugins: Issues #69-70 (sub-issues of #113)
- Infra: Issues #17, #18, #25, #35, #106 (sub-issues of #114)
- Marketing: Issues #43-48 (sub-issues of #115)
- Premium: Issues #59-68 (sub-issues of #116)

#### 12. All Issues View

1. Click `+ New view`
2. Name: `All Issues`
3. No filter (leave empty)
4. Click view options (⋮) → Layout → `Hierarchy` (if available)
5. This shows all issues with parent/child relationships

### Using Hierarchy View

GitHub Projects supports a Hierarchy View that shows parent/sub-issue relationships:

1. In any table view, click the view options (⋮)
2. Select "Group by" → "Parent issue"
3. Or use the dedicated Hierarchy layout if available

### View Tips

- **Drag tabs** to reorder views
- **Right-click tab** to rename or delete
- **Star a view** to make it the default when opening the project
- Views are shared with all project members

## Issue Rules

### Creating New Work

1. **Always create under a parent** - New features/bugs should be sub-issues of an existing release or track
2. **Don't create orphan issues** - If no parent exists, create the parent first or add to Track: Infrastructure & Maintenance
3. **Use the correct parent type**:
   - Version-bound work → Release parent
   - Ongoing/unversioned work → Track parent

### Parent Issue Structure

Release parents should include:

```markdown
## Release Goal
[One sentence describing the release objective]

## Scope
- [Bullet list of what's included]

## Acceptance Criteria
- [ ] [Checkboxes for release criteria]
```

Track parents should include:

```markdown
## Goal
[Description of the track's purpose]

## Scope
- [Types of work that belong here]
```

### Labels

| Label | Usage |
| ----- | ----- |
| `release` | Parent issues for versioned releases |
| `track` | Parent issues for ongoing work streams |
| Other labels | Applied to sub-issues as needed |

### Milestones

- Releases have matching milestones (v1.1.0, v1.2.0, etc.)
- Tracks do not have milestones
- Sub-issues inherit the milestone from their release parent

## Viewing Individual Parents

To view a single parent with all its sub-issues:

1. **In GitHub Issues**: Click the parent issue → Sub-issues section shows all children
2. **In Projects**: Use Hierarchy View → Expand the parent row
3. **Via URL**: `https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/108` (replace 108 with parent number)

### Quick Links to Parents

- [#108 - v1.1.0 Internal Packaging](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/108)
- [#109 - v1.2.0 Linux Packaging](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/109)
- [#110 - v1.3.0 Advanced Packaging](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/110)
- [#111 - v2.0.0 OAuth & Multi-Provider](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/111)
- [#117 - v1.4.0 Notebook Format Support](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/117)
- [#112 - Track: Testing Infrastructure](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/112)
- [#113 - Track: Plugin System](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/113)
- [#114 - Track: Infrastructure & Maintenance](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/114)
- [#115 - Track: Marketing & Launch](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/115)
- [#116 - Track: Premium Features](https://github.com/whizbangdevelopers-org/Qepton-Dev/issues/116)

## Adding Sub-Issues

### Via GitHub UI

1. Open the parent issue
2. Scroll to "Sub-issues" section
3. Click "Add sub-issue"
4. Search for existing issue or create new

### Via GitHub CLI

```bash
# Link existing issue as sub-issue
gh api graphql -f query='
mutation {
  addSubIssue(input: {
    issueId: "PARENT_NODE_ID"
    subIssueId: "CHILD_NODE_ID"
  }) {
    subIssue { number title }
  }
}'
```

### Via GitHub API (get node IDs first)

```bash
# Get node ID for an issue
gh api graphql -f query='
query {
  repository(owner: "whizbangdevelopers-org", name: "Qepton-Dev") {
    issue(number: 108) { id }
  }
}'
```
