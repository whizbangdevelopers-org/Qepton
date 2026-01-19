# Contributing to Qepton

Thank you for your interest in contributing to Qepton! This guide will help you get started.

## Reporting Issues

### Bug Reports

1. **Search existing issues** first to avoid duplicates
2. Use the **Bug Report** template when creating a new issue
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Platform (OS, browser, Electron version)
   - Screenshots if applicable

### Feature Requests

1. Check if the feature is already planned in [Issues](https://github.com/whizbangdevelopers/Qepton/issues)
2. Use the **Feature Request** template
3. Describe the use case and why it would be valuable

### Issue Workflow

When your issue is labeled `confirmed`:
- It has been accepted for development
- It will be tracked internally
- You'll be notified when a fix is available

## Pull Requests

### Before You Start

1. **Open an issue first** to discuss the change
2. Wait for maintainer feedback before investing time in code
3. For small fixes (typos, docs), you can submit directly

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Qepton.git
cd Qepton

# Install dependencies
npm install

# Start development server
npm run dev
```

### Code Style

- **TypeScript** - All new code should be typed
- **ESLint/Prettier** - Run `npm run lint` and `npm run format` before committing
- **Vue 3 Composition API** - Use `<script setup>` syntax
- **Quasar components** - Prefer Quasar UI components over custom implementations

### Commit Messages

Use clear, descriptive commit messages:

```
Add dark mode toggle to settings

- Add ThemeToggle component
- Update settings store with theme state
- Persist preference to localStorage
```

### Submitting a PR

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm run lint`
4. Push and open a PR against `main`
5. Fill out the PR template

### PR Review Process

- All PRs are reviewed by maintainers
- Feedback may be provided for changes
- Once approved, PRs are squash-merged

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Help others learn and grow

## Questions?

- Open a [Discussion](https://github.com/whizbangdevelopers/Qepton/discussions) for general questions
- Email: support@whizbangdevelopers.com

---

Thank you for contributing to Qepton!
