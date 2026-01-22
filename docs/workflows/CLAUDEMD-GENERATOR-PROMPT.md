# CLAUDE.md Generator Prompt

Use this prompt with Claude to generate a CLAUDE.md file for new projects.

---

## Prompt

```
I need you to help me create a CLAUDE.md file for my project. CLAUDE.md provides guidance to Claude Code when working with this codebase.

Please ask me the following questions one at a time, then generate the CLAUDE.md file:

**Project Basics:**
1. What is the project name and a one-line description?
2. What is the primary language/framework? (e.g., PHP/PDO, Quasar/Vue, Node.js)
3. What is the repository URL and visibility (public/private)?
4. What is the App ID / package name if applicable?
5. Who is the developer/organization name?

**Architecture:**
6. Is this project MVC, OOP with direct routing, or another pattern?
7. What is the project structure? (main directories and their purposes)
8. What are the main entry points? (e.g., index.php, main.ts, App.vue)
9. What database does it use? (MySQL, PostgreSQL, SQLite, none)
10. Are there any external APIs or services it connects to?

**Development:**
11. What commands are used for development? (e.g., npm run dev, php -S localhost:8000)
12. What commands are used for testing? (e.g., npm test, composer test)
13. What commands are used for building/deployment?
14. Are there any environment variables or config files needed?

**Conventions:**
15. Any specific coding conventions or patterns to follow?
16. Any files or directories to exclude from AI modifications?
17. Any special git commit message format?

After gathering this information, generate a complete CLAUDE.md file following this structure:
- Project overview
- Canonical identifiers table
- Language & runtime info
- Project structure with directory descriptions
- Main entry points
- Key dependencies
- Common commands table
- Architecture section (state management, services, etc.)
- Testing structure
- Any project-specific conventions
```

---

## Template for PHP/PDO Projects (WG Admin, DemoCRM style)

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

[PROJECT_NAME] is [ONE_LINE_DESCRIPTION].

## Canonical Identifiers

| Key              | Value                        |
| ---------------- | ---------------------------- |
| GitHub Repo      | [GITHUB_ORG]/[REPO_NAME]     |
| App ID           | [APP_ID_IF_APPLICABLE]       |
| Developer Name   | [DEVELOPER_NAME]             |
| Support Email    | [SUPPORT_EMAIL]              |

## Language & Runtime

- **Language**: PHP 8.x
- **Database**: MySQL via PDO
- **Frontend**: Bootstrap 5 / jQuery (transitioning to Quasar)
- **Architecture**: OOP with Direct Routing (not MVC)

## Project Structure

- **api/**: API endpoints (direct routing, e.g., api/users.php → /api/users)
- **includes/**: Core classes and configuration
  - `Database.php`: PDO wrapper with prepared statements
  - `Helpers.php`: Utility functions
  - `config.php`: Environment configuration
- **assets/**: CSS, JS, images
- **templates/**: Reusable HTML components
- **public/**: Web root (if using separate public directory)

## Main Entry Points

- **index.php**: Main application entry
- **api/*.php**: REST API endpoints
- **includes/autoload.php**: Class autoloader

## Direct Routing Pattern

This project uses direct file routing (not MVC):
- `/users` → `users.php` or `pages/users.php`
- `/api/users` → `api/users.php`
- Query parameters: `/api/users?id=123`

## Database Conventions

```php
// Always use prepared statements
$stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);

// Use the Database class wrapper
$db = Database::getInstance();
$users = $db->fetchAll("SELECT * FROM users WHERE active = ?", [1]);
```

## Common Commands

| Task | Command |
| ---- | ------- |
| Start dev server | `php -S localhost:8000` |
| Run tests | `composer test` |
| Lint code | `composer lint` |
| Security check | `composer security` |
| Database migration | `php migrate.php` |

## Security Conventions

- All user input must be sanitized
- Use prepared statements for ALL database queries
- Validate and escape output for XSS prevention
- Session tokens for CSRF protection
- Never commit credentials or .env files

## Testing

- **PHPUnit** for unit tests in `tests/`
- Test database: separate from production
- Run `composer test` before committing

## Git Commit Guidelines

- Keep commits focused and atomic
- Use present tense: "Add feature" not "Added feature"
- Reference issue numbers: "Fix login bug (#123)"
```

---

## Template for Quasar/Vue Projects

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

[PROJECT_NAME] is [ONE_LINE_DESCRIPTION]. Built with Quasar Framework (Vue 3).

## Canonical Identifiers

| Key              | Value                        |
| ---------------- | ---------------------------- |
| GitHub Repo      | [GITHUB_ORG]/[REPO_NAME]     |
| App ID           | com.[ORG].[APPNAME]          |
| Developer Name   | [DEVELOPER_NAME]             |

## Language & Runtime

- **Language**: TypeScript / Vue 3
- **Version**: Node.js >= 18.0.0, npm >= 9.0.0
- **Build System**: Quasar CLI with Vite
- **Package Manager**: npm

## Project Structure

- **src/**: Main application source
  - **components/**: Vue components
  - **pages/**: Route pages
  - **layouts/**: Layout components
  - **stores/**: Pinia state stores
  - **services/**: Business logic and API clients
  - **composables/**: Vue composables
  - **boot/**: App initialization modules
- **src-electron/**: Electron main process (if desktop)
- **src-capacitor/**: Mobile app config (if mobile)
- **tests/**: Unit and E2E tests

## Main Entry Points

- **src/App.vue**: Root component
- **src/router/routes.ts**: Route definitions
- **src/stores/**: Pinia stores

## Common Commands

| Task | Command |
| ---- | ------- |
| Dev server | `npm run dev` |
| Electron dev | `npm run dev:electron` |
| Build | `npm run build` |
| Unit tests | `npm run test:unit:run` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |

## State Management (Pinia)

Stores follow this pattern:
- Typed state interface
- Getters for computed values
- Actions for mutations
- Persistence via pinia-plugin-persistedstate

## Component Conventions

- Use `<script setup lang="ts">` syntax
- Composition API only (no Options API)
- Quasar components from `q-` namespace
- Props and emits must be typed

## Testing

- **Unit**: Vitest + Vue Test Utils
- **E2E**: Playwright (run via Docker)
- Run `npm run test:prepush` before pushing

## Git Commit Guidelines

Do NOT add Co-Authored-By lines. Keep commits clean.
```

---

## Usage

1. Copy the appropriate template for your project type
2. Replace placeholders with actual values
3. Or use the prompt above to have Claude generate it interactively
4. Save as `CLAUDE.md` in the project root
5. Add to `.gitignore` if you don't want it in the repo (optional)
