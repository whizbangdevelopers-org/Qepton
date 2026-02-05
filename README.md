# Qepton

<div align="center">

**Enhanced Multi-Platform Prompt and Code Snippet Manager**

[![Tests](https://github.com/whizbangdevelopers-org/Qepton-Dev/actions/workflows/test.yml/badge.svg)](https://github.com/whizbangdevelopers-org/Qepton-Dev/actions/workflows/test.yml)
[![Unit Tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/whizbangdevelopers-user/a129d60da2b3f8f57b6a578bf7347eef/raw/vitest-badge.json)](https://github.com/whizbangdevelopers-org/Qepton-Dev/actions/workflows/test.yml)
[![E2E Tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/whizbangdevelopers-user/a129d60da2b3f8f57b6a578bf7347eef/raw/playwright-badge.json)](https://github.com/whizbangdevelopers-org/Qepton-Dev/tree/main/testing/e2e)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Quasar](https://img.shields.io/badge/Quasar-2.x-1976D2?logo=quasar)](https://quasar.dev/)

**[Try the PWA](https://whizbangdevelopers-org.github.io/Qepton/)** | **[Try Demo](https://qepton-demo.github.io)** | **[Download Desktop App](https://github.com/whizbangdevelopers-org/Qepton/releases)**

</div>

---

Qepton is a powerful AI Prompt and code snippet manager that connects to multiple git-based snippet services. Built with Vue 3 and Quasar Framework, it runs as a desktop app (Electron), web app (PWA), or mobile app (Capacitor)(Future).

## Features

### Core Features (Free)
- 🔗 **GitHub Gist** - Full support for GitHub Gist API
- 🏷️ **Smart Tagging** - Auto-tags by language, custom tags via `#tag` syntax
- 🔍 **Fuzzy Search** - Fast search across all snippets with Fuse.js
- ✏️ **CodeMirror 6** - Modern code editor with syntax highlighting
- 📝 **Markdown Preview** - Render markdown with KaTeX math support
- 📓 **Jupyter Support** - View and edit Jupyter notebooks
- ⭐ **Starred Gists** - Bookmark gists on GitHub (synced across devices)
- 📌 **Pinned Gists** - Quick local access to frequently used gists
- ✅ **Bulk Operations** - Star, unstar, pin, and unpin multiple gists at once
- ⚙️ **Customizable Navigation** - Show/hide sections in navigation drawer
- 🔄 **Auto Updates** - Desktop app checks for updates automatically
- 🌙 **Dark Mode** - Beautiful dark theme
- 🖥️ **Multi-Platform** - Desktop, web, and mobile

### Coming Soon
- 🔄 **GitLab Snippets** - Support for GitLab
- 🪣 **Bitbucket Snippets** - Support for Bitbucket
- 🔌 **Plugin System** - Extend functionality with plugins

### Premium Features
Premium features are available in [Qepton Premium](https://github.com/wriver4/qepton-premium):
- 🤖 **AI Assist** - Code explanations, suggestions, auto-tagging
- 👥 **Team Sync** - Real-time collaboration
- 🏠 **Gitea/Forgejo** - Self-hosted git service support
- 🔀 **Migration Tools** - Cross-platform snippet migration

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/wriver4/qepton.git
cd qepton

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
# Build web app (SPA)
npm run build

# Build PWA
npm run build:pwa

# Build desktop app (Electron)
npm run build:electron
```

## Installation

### Desktop App (Electron)

Pre-built binaries are available in the [Releases](https://github.com/wriver4/qepton/releases) page.

**Linux:**
- **AppImage**: Download `Qepton-x.x.x.AppImage`, make it executable (`chmod +x`), and run
- **Snap**: `sudo snap install qepton_x.x.x_amd64.snap --dangerous`

  > The `--dangerous` flag is required because the snap is locally built and not signed by the Snap Store. This is safe for releases you download directly from our GitHub.

**macOS:**
- Download the `.dmg` file and drag Qepton to Applications

**Windows:**
- Run the `.exe` installer or extract the portable `.7z` archive

### Nix / NixOS

Qepton is available via our [NUR packages repository](https://github.com/whizbangdevelopers-org/nur-packages).

**Quick Install (Flakes):**
```bash
# Try it out
nix run github:whizbangdevelopers-org/nur-packages#qepton

# Or build it
nix build github:whizbangdevelopers-org/nur-packages#qepton
```

**NixOS Configuration (Flakes):**
```nix
{
  inputs.whizbang-nur.url = "github:whizbangdevelopers-org/nur-packages";

  outputs = { self, nixpkgs, whizbang-nur }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [
            whizbang-nur.packages.${pkgs.system}.qepton
          ];
        })
      ];
    };
  };
}
```

**With NUR (once registered):**
```nix
{ pkgs, ... }:
let
  nur = import (builtins.fetchTarball "https://github.com/nix-community/NUR/archive/master.tar.gz") {
    inherit pkgs;
  };
in {
  environment.systemPackages = [ nur.repos.whizbangdevelopers.qepton ];
}
```

### PWA (Progressive Web App)

**Live Demo:** [https://whizbangdevelopers-org.github.io/Qepton/](https://whizbangdevelopers-org.github.io/Qepton/)

The PWA build can be deployed to any static hosting service:

```bash
npm run build:pwa
# Deploy contents of dist/pwa/ to your web server
```

Supported hosting options:
- **Netlify**: Drag and drop `dist/pwa` folder
- **Vercel**: `vercel dist/pwa`
- **GitHub Pages**: Push `dist/pwa` contents to `gh-pages` branch
- **Self-hosted**: Serve `dist/pwa` with any HTTP server (nginx, Apache, etc.)

### SPA (Single Page Application)

For traditional web deployment without offline support:

```bash
npm run build
# Deploy contents of dist/spa/ to your web server
```

**Note:** The SPA requires an HTTP server. Opening `index.html` directly won't work due to CORS restrictions.

Quick local preview:
```bash
npx quasar serve dist/spa
```

## Project Structure

```
src/
├── core/              # Core types and plugin system
├── adapters/          # Service adapters (GitHub, GitLab, etc.)
│   ├── github/
│   ├── gitlab/
│   └── bitbucket/
├── plugins/           # Plugin implementations
│   └── basic/         # Free plugins
├── components/        # Vue components
├── pages/             # Route pages
├── layouts/           # Layout components
├── stores/            # Pinia state stores
├── services/          # Business logic
├── composables/       # Vue composables
└── types/             # TypeScript types
```

## Architecture

### Adapter Pattern
Qepton uses an adapter pattern to support multiple snippet services:

```typescript
interface SnippetServiceAdapter {
  serviceType: ServiceType;
  listSnippets(): Promise<Snippet[]>;
  createSnippet(payload): Promise<Snippet>;
  // ... more methods
}
```

### Plugin System
Extend Qepton with plugins:

```typescript
const myPlugin: QeptonPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  install(app) {
    app.registerCommand({
      id: 'my-command',
      execute: () => { /* ... */ }
    });
  }
};
```

## Development

### Commands

```bash
npm run dev              # Start dev server (SPA)
npm run dev:electron     # Start Electron dev
npm run dev:pwa          # Start PWA dev
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run test:unit        # Run unit tests
npm run test:unit:run    # Run tests once
```

### Testing

Unit tests use Vitest:
```bash
npm run test:unit
```

E2E tests use Playwright (via Docker):
```bash
cd e2e-docker
./scripts/run-tests.sh
```

## Release Verification

We test release artifacts on real hardware and VMs before publishing. This matrix shows current verification status.

<!-- VERIFICATION-TABLE-START -->
| Format        | Platform       | Test Environment    | Status | Last Verified |
| ------------- | -------------- | ------------------- | ------ | ------------- |
| NSIS (.exe)   | Windows x64    | Win10 Laptop        | ⏳     | v1.0.12       |
| Portable .7z  | Windows x64    | Win10 Laptop        | ⏳     | v1.0.12       |
| DMG           | macOS arm64    | Mac Mini M1         | ⏳     | v1.0.12       |
| DMG           | macOS x64      | —                   | ⏸️     | —             |
| AppImage      | Linux x64      | Ubuntu Laptop       | ⏳     | v1.0.20       |
| deb           | Debian/Ubuntu  | Ubuntu Laptop       | ⏳     | v1.0.12       |
| snap          | Ubuntu         | Ubuntu Laptop       | ⏳     | v1.0.12       |
| rpm           | Fedora         | Fedora VM (KVM)     | ⏳     | v1.0.12       |
| Flatpak       | Linux          | Fedora VM (KVM)     | ⏳     | v1.0.12       |
| pacman        | Arch Linux     | Arch VM (KVM)       | ⏳     | v1.0.12       |
| Nix/NUR       | NixOS/Linux    | NixOS Laptop        | ⏳     | v1.0.20       |
| PWA           | Web            | GitHub Pages        | ✅     | v1.0.22       |
| iOS           | Mobile         | —                   | 🔮     | —             |
| Android       | Mobile         | —                   | 🔮     | —             |
<!-- VERIFICATION-TABLE-END -->

**Legend:** ✅ Verified | ⏳ Pending | ⏸️ Skipped | 🔮 Future

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Originally inspired by [Lepton](https://github.com/nicokosi/lepton)
- Built with [Quasar Framework](https://quasar.dev/)
- Code editor powered by [CodeMirror 6](https://codemirror.net/)
