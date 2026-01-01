# Qepton Dashboard Roadmap

## Current Qepton Dashboard Features

- Virtual scroll gist list with title, description, files, date, visibility
- Tag navigation (All Gists, Pinned, Languages, Custom tags)
- Gist detail dialog with code preview, Markdown/Jupyter rendering
- Pull-to-refresh, sync from GitHub
- New gist creation, edit, delete
- [x] **Global search bar** with instant filtering (Cmd/Ctrl+K)
- [x] **Saved searches** with persist to local storage
- [x] **Filter chips**: visibility (All/Public/Private), language dropdown, date range

---

## Feature Comparison & Gaps

### 1. Search Capabilities (HIGH PRIORITY)

| Feature            | Gisto | Cacher | GistHive | massCode | Pieces | **Qepton**     |
| ------------------ | ----- | ------ | -------- | -------- | ------ | -------------- |
| Global search bar  | ✅    | ✅     | ✅       | ✅       | ✅     | ✅ Implemented |
| Filter by language | ✅    | ✅     | ✅       | ✅       | ✅     | ✅ Implemented |
| Advanced filters   | ❌    | ✅     | ✅       | ✅       | ✅     | ✅ Implemented |
| Saved searches     | ❌    | ✅     | ❌       | ❌       | ✅     | ✅ Implemented |
| Regex search       | ❌    | ❌     | ❌       | ❌       | ❌     | ✅ Implemented |

**Suggested additions:**

- [x] Filter chips: language, visibility (public/private), date range
- [x] Saved searches for frequently used queries

---

### 2. Organization & Navigation

| Feature             | Gisto | Cacher | GistHive | massCode | **Qepton**     |
| ------------------- | ----- | ------ | -------- | -------- | -------------- |
| Folders/Collections | ❌    | ✅     | ✅       | ✅       | ❌             |
| Color-coded labels  | ❌    | ✅     | ✅       | ✅       | ✅ Implemented |
| Starred/Favorites   | ✅    | ✅     | ❌       | ❌       | ✅ Implemented |
| Recent gists        | ❌    | ✅     | ❌       | ❌       | ✅ Implemented |
| Navigation settings | ❌    | ❌     | ❌       | ❌       | ✅ Implemented |
| Frequently used     | ❌    | ❌     | ❌       | ❌       | ❌             |

**Note: Stars vs Pinned Tags distinction:**

- **⭐ Starred Gists** (GitHub feature): Individual gists you've starred on GitHub. Synced from GitHub API. Can include other users' gists.
- **📌 Pinned Tags** (Qepton feature): Tag categories pinned for quick navigation. Local-only, organizational shortcuts.

**Suggested additions:**

- [x] Starred Gists section - shows gists starred on GitHub
- [x] Recents section (last 10 accessed)
- [x] Color-coded tags - assign colors to custom tags (16-color palette, solid/outline icons)
- [x] Sort options: by name, date modified (synced preference)
- [x] Navigation display settings - toggle visibility of All Gists, Starred, Recent sections

---

### 3. Dashboard Layout & Views

| Feature               | Gisto | Cacher | GistHive | massCode | **Qepton**     |
| --------------------- | ----- | ------ | -------- | -------- | -------------- |
| 3-column layout       | ✅    | ✅     | ✅       | ✅       | ✅ Implemented |
| Inline preview        | ✅    | ✅     | ✅       | ✅       | ✅ Implemented |
| Card/List view toggle | ❌    | ❌     | ❌       | ❌       | ✅ Implemented |
| Split-pane editor     | ❌    | ❌     | ❌       | ✅       | ❌ NO          |

**Suggested additions:**

- [x] 3-pane layout: sidebar | gist list | code preview (like massCode)
- [x] Inline preview panel instead of full-screen dialog
- [x] View toggle: compact list vs card view

---

### 4. Editor & Code Features

| Feature                 | Cacher     | GistHive | massCode   | **Qepton**     |
| ----------------------- | ---------- | -------- | ---------- | -------------- |
| Editor                  | CodeMirror | Monaco   | CodeMirror | CodeMirror     |
| Live preview (HTML/CSS) | ❌         | ❌       | ✅         | 🔲 Future      |
| Prettier formatting     | ❌         | ❌       | ✅         | ✅ Implemented |
| Presentation mode       | ❌         | ❌       | ✅         | 🔲 Future      |

**Suggested additions:**

- [x] One-click copy button more prominent
- [x] Format code button (Prettier integration)
- [ ] Live HTML/CSS preview tab

---

### 5. Collaboration & Sharing

| Feature         | Cacher | GistHive | **Qepton**      |
| --------------- | ------ | -------- | --------------- |
| Team workspaces | ✅     | ✅       | 🔲 Future       |
| Share links     | ✅     | ✅       | ✅ Implemented  |
| Version history | ❌     | ✅       | ✅ Implemented  |

**Suggested additions:**

- [x] Quick share button with copy-to-clipboard URL
- [x] Version history viewer (GitHub has this data)

---

### 6. Bulk Operations

**Suggested additions:**

- [ ] Multi-select mode with checkboxes
- [ ] Bulk actions: delete, tag, change visibility
- [ ] Select all / Deselect all

---

### 7. Keyboard Shortcuts

**Suggested additions:**

- [x] `Cmd/Ctrl+K` - Focus search
- [x] `Cmd/Ctrl+N` - New gist (exists)
- [x] `↑/↓` or `j/k` - Navigate gist list and file list
- [x] `Enter` - Open selected gist / expand file
- [x] `Cmd/Ctrl+C` - Copy focused file content
- [x] `Cmd/Ctrl+E` - Edit current gist (exists)
- [x] `Tab` - Switch focus between gist list and preview pane
- [x] `Home/End` or `g/G` - Jump to first/last item
- [x] `Escape` - Clear keyboard focus
- [x] Shortcut hints visible in UI (shown when keyboard navigation active)
- [x] Conflict resolution: shortcuts disabled when inside CodeMirror/inputs

---

### 8. Stats & Analytics (from Pieces)

**Suggested additions:**

- [x] Dashboard stats: Total gists, languages count, last sync time
- [x] Most used tags widget
- [x] Gist activity chart (12 months)
- [x] Recently updated gists

---

### 9. Persistence & Cross-Device Sync

| Feature           | Approach               | Status         |
| ----------------- | ---------------------- | -------------- |
| Local preferences | localStorage via Pinia | ✅ Implemented |
| Cross-device sync | Private GitHub Gist    | ✅ Implemented |
| Team workspaces   | Backend required       | 🔲 Future      |
| Offline caching   | SQLite                 | 🔲 Future      |

**Current Implementation:**

- [x] Settings synced via private `.qepton-settings.json` gist
- [x] Synced settings: pinned tags, recent gists, saved searches, UI preferences, tag colors
- [x] Debounced writes (2s) to minimize API calls
- [x] Works across Electron, PWA, and mobile (Capacitor)

**Future Considerations:**

- **Team workspaces**: Would require Supabase/Firebase or custom backend
- **Offline-first**: SQLite for local caching of gist content when teams are added

---

## Priority Recommendations

### Must Have (High Impact)

1. [x] **Global search bar** with instant filtering
2. [x] **3-pane layout** with inline preview (no dialog)
3. [x] **Starred Gists section** - GitHub starred gists in navigation
4. [x] **Sort options** dropdown (name, date modified)
5. [x] **Keyboard navigation** through gist list (j/k, Enter, Tab, Cmd+C)

### Should Have (Medium Impact)

6. [x] **Color-coded tags** - 16-color palette, solid icon when colored
7. [x] **Recents section** - Last 10 viewed gists
8. [ ] **Bulk operations** (multi-select, batch delete/tag)
9. [x] **Quick share/copy URL** button
10. [x] **Dashboard stats** (full-screen modal with charts)
11. [x] **Navigation display settings** - Toggle All Gists/Starred/Recent visibility

### Nice to Have

12. [x] Advanced search filters (date range, visibility)
13. [x] Saved searches
14. [x] Version history viewer
15. [x] Format code button (Prettier)
16. [x] View toggle (list/card)
