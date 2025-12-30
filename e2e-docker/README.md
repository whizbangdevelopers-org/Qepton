# Qepton E2E Testing with Docker

> Containerized Playwright E2E testing for consistent cross-environment test execution

## Quick Start

```bash
# 1. Setup (first time only)
./scripts/setup.sh

# 2. Run all tests
./scripts/run-tests.sh

# 3. View report
open output/reports/index.html
```

## Project Structure

```
e2e-docker/
├── config/
│   └── Dockerfile           # Playwright Docker image
├── scripts/
│   ├── setup.sh             # Environment setup
│   ├── run-tests.sh         # Run all tests
│   ├── run-ui.sh            # Interactive UI mode
│   └── run-single.sh        # Run single test file
├── output/
│   ├── reports/             # HTML test reports
│   ├── test-results/        # JSON results + traces
│   └── logs/                # Execution logs
├── docker-compose.yml       # Service definitions
└── README.md                # This file
```

## Available Commands

### Run All Tests
```bash
./scripts/run-tests.sh
```
Runs the complete E2E test suite with 4 parallel workers.

### Run Specific Test File
```bash
./scripts/run-single.sh tests/e2e/auth.spec.ts
./scripts/run-single.sh tests/e2e/gists.spec.ts
```

### Interactive UI Mode
```bash
./scripts/run-ui.sh
```
Opens Playwright's interactive UI at http://localhost:9323

### Watch Mode
```bash
cd e2e-docker
docker-compose --profile watch up
```
Re-runs tests automatically on file changes.

### Debug Mode
```bash
cd e2e-docker
docker-compose --profile debug up
```
Runs with `PWDEBUG=1` for step-through debugging.

## Docker Compose Profiles

| Profile | Description |
|---------|-------------|
| (default) | Run all tests once |
| `watch` | Re-run on file changes |
| `ui` | Interactive Playwright UI |
| `debug` | Step-through debugging |
| `dev` | Start Quasar dev server only |
| `single` | Run single test file |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TEST_TOKEN` | GitHub token for real API tests |
| `TEST_FILE` | Test file path (for single profile) |
| `CI` | Set to `true` for CI environment |

### Using Real GitHub API
```bash
export GITHUB_TEST_TOKEN="ghp_your_token_here"
./scripts/run-tests.sh
```

## Test Reports

After running tests, reports are available at:

| Report | Path |
|--------|------|
| HTML Report | `output/reports/index.html` |
| JSON Results | `output/test-results/` |
| Screenshots | `output/reports/` (on failure) |
| Videos | `output/reports/` (on failure) |
| Traces | `output/test-results/*/trace.zip` |

## Playwright MCP Integration

The project includes Playwright MCP server configuration in `.mcp.json` for Claude Code integration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chromium"]
    }
  }
}
```

This enables Claude to interact with the browser for automated testing workflows.

## Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| Authentication | 9 | Login/logout flows |
| Gists | 30+ | CRUD operations |
| Search | 14 | Search functionality |
| Tags | 17 | Tag management |
| Keyboard | 17 | Shortcut handling |
| UI Modes | 20+ | Theme, dashboard |
| Rendering | 10+ | Code display |

**Total: 109 tests** across 7 test files

## Troubleshooting

### Docker Build Fails
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

### Tests Timeout
```bash
# Increase timeout in docker-compose.yml or run fewer workers
docker-compose run playwright-tests npx playwright test --workers=1
```

### Network Issues
The container uses `network_mode: host` to access localhost services. Ensure port 9000 is available for the Quasar dev server.

### View Failed Test Details
```bash
# Open trace for debugging
npx playwright show-trace output/test-results/*/trace.zip
```

## System Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 5GB disk space (for browsers)

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Quasar Testing](https://quasar.dev/quasar-cli-vite/testing-and-auditing)
- [Playwright MCP Server](https://github.com/microsoft/playwright-mcp)
