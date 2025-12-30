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
| Feature | Gisto | Cacher | GistHive | massCode | Pieces | **Qepton** |
|---------|-------|--------|----------|----------|--------|------------|
| Global search bar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Implemented |
| Filter by language | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Implemented |
| Advanced filters | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ Implemented |
| Saved searches | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ Implemented |
| Regex search | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Implemented |

**Suggested additions:**
- [x] Filter chips: language, visibility (public/private), date range
- [x] Saved searches for frequently used queries

---

### 2. Organization & Navigation
| Feature | Gisto | Cacher | GistHive | massCode | **Qepton** |
|---------|-------|--------|----------|----------|------------|
| Folders/Collections | ❌ | ✅ | ✅ | ✅ | ❌ |
| Color-coded labels | ❌ | ✅ | ✅ | ✅ | ❌ |
| Starred/Favorites | ✅ | ✅ | ❌ | ❌ | ✅ Implemented |
| Recent gists | ❌ | ✅ | ❌ | ❌ | ✅ Implemented |
| Frequently used | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note: Stars vs Pinned Tags distinction:**
- **⭐ Starred Gists** (GitHub feature): Individual gists you've starred on GitHub. Synced from GitHub API. Can include other users' gists.
- **📌 Pinned Tags** (Qepton feature): Tag categories pinned for quick navigation. Local-only, organizational shortcuts.

**Suggested additions:**
- [x] Starred Gists section - shows gists starred on GitHub
- [x] Recents section (last 10 accessed)
- [ ] Color-coded tags - assign colors to custom tags
- [ ] Sort options: by name, date created, date modified, file count

---

### 3. Dashboard Layout & Views
| Feature | Gisto | Cacher | GistHive | massCode | **Qepton** |
|---------|-------|--------|----------|----------|------------|
| 3-column layout | ✅ | ✅ | ✅ | ✅ | ✅ Implemented |
| Inline preview | ✅ | ✅ | ✅ | ✅ | ✅ Implemented |
| Card/List view toggle | ❌ | ❌ | ❌ | ❌ | ❌ |
| Split-pane editor | ❌ | ❌ | ❌ | ✅ | ❌ |

**Suggested additions:**
- [x] 3-pane layout: sidebar | gist list | code preview (like massCode)
- [x] Inline preview panel instead of full-screen dialog
- [ ] View toggle: compact list vs card view

---

### 4. Editor & Code Features
| Feature | Cacher | GistHive | massCode | **Qepton** |
|---------|--------|----------|----------|------------|
| Monaco editor | ❌ | ✅ | ❌ | ❌ (CodeMirror) |
| Live preview (HTML/CSS) | ❌ | ❌ | ✅ | ❌ |
| Prettier formatting | ❌ | ❌ | ✅ | ❌ |
| Presentation mode | ❌ | ❌ | ✅ | ❌ |

**Suggested additions:**
- [ ] One-click copy button more prominent
- [ ] Format code button (Prettier integration)
- [ ] Live HTML/CSS preview tab

---

### 5. Collaboration & Sharing
| Feature | Cacher | GistHive | **Qepton** |
|---------|--------|----------|------------|
| Team workspaces | ✅ | ✅ | ❌ |
| Share links | ✅ | ✅ | ✅ (via GitHub) |
| Version history | ❌ | ✅ | ❌ |

**Suggested additions:**
- [ ] Quick share button with copy-to-clipboard URL
- [ ] Version history viewer (GitHub has this data)

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
- [ ] `↑/↓` - Navigate gist list
- [ ] `Enter` - Open selected gist
- [ ] `Cmd/Ctrl+C` - Copy focused file content
- [ ] `Cmd/Ctrl+E` - Edit current gist
- [ ] Shortcut hints visible in UI

---

### 8. Stats & Analytics (from Pieces)
**Suggested additions:**
- [ ] Dashboard header stats: Total gists, languages count, last sync time
- [ ] Most used tags widget
- [ ] Gist activity (recently updated)

---

### 9. Persistence & Cross-Device Sync
| Feature | Approach | Status |
|---------|----------|--------|
| Local preferences | localStorage via Pinia | ✅ Implemented |
| Cross-device sync | Private GitHub Gist | ✅ Implemented |
| Team workspaces | Backend required | 🔲 Future |
| Offline caching | SQLite | 🔲 Future |

**Current Implementation:**
- [x] Settings synced via private `.qepton-settings.json` gist
- [x] Synced settings: pinned tags, recent gists, saved searches, UI preferences
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
4. [ ] **Sort options** dropdown
5. [ ] **Keyboard navigation** through gist list

### Should Have (Medium Impact)
6. [ ] **Color-coded tags**
7. [x] **Recents section** - Last 10 viewed gists
8. [ ] **Bulk operations** (multi-select, batch delete/tag)
9. [ ] **Quick share/copy URL** button
10. [ ] **Dashboard stats header**

### Nice to Have
11. [x] Advanced search filters (date range, visibility)
12. [x] Saved searches
13. [ ] Version history viewer
14. [ ] Format code button
15. [ ] View toggle (list/card)
