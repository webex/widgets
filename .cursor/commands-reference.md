# Quick Commands Reference

## Installation & Setup

```bash
# Clone repository
git clone git@github.com:webex/widgets.git
cd widgets

# Install dependencies
yarn install

# Initial build (all packages)
yarn run build

# Full build (production)
yarn run build:prod
```

## Building Packages

```bash
# Build all packages (parallel - development)
yarn run build:dev

# Build all packages (sequential - production)
yarn run build:prod

# Build specific package
yarn workspace @webex/cc-store run build:src
yarn workspace @webex/cc-ui-logging run build:src
yarn workspace @webex/cc-components run build:src
yarn workspace @webex/cc-station-login run build:src
yarn workspace @webex/cc-task run build:src
yarn workspace @webex/cc-user-state run build:src
yarn workspace @webex/cc-widgets run build:src

# Watch mode (auto-rebuild on changes)
yarn workspace @webex/cc-components run build:watch
```

## Running Sample Applications

```bash
# React sample (with HMR - RECOMMENDED for development)
yarn samples:serve-react
# Opens http://localhost:3000

# Web Components sample
yarn samples:serve-wc
# Opens http://localhost:8080

# Build samples
yarn samples:build

# Serve static samples
yarn samples:serve
# Opens http://localhost:8080
```

## Testing

### Unit Tests

```bash
# Run all unit tests
yarn run test:cc-widgets

# Run tests for specific package
yarn workspace @webex/cc-components run test:unit
yarn workspace @webex/cc-store run test:unit
yarn workspace @webex/cc-widgets run test:unit

# Watch mode
yarn workspace @webex/cc-components run test:unit --watch

# With coverage
yarn workspace @webex/cc-components run test:unit --coverage

# Specific test file
yarn workspace @webex/cc-components run test:unit -- MyComponent.test.tsx

# Test pattern matching
yarn workspace @webex/cc-components run test:unit -- --testNamePattern="should render"
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
yarn run test:e2e

# Run specific test file
yarn playwright test playwright/tests/station-login-test.spec.ts

# Run specific suite
yarn playwright test playwright/suites/station-login-user-state-tests.spec.ts

# With UI
yarn playwright test --ui

# Debug mode
yarn playwright test --debug

# Headed (see browser)
yarn playwright test --headed

# Show report
yarn playwright show-report
```

### Linting & Style Tests

```bash
# Run linting on all packages
yarn run test:styles

# Lint specific package
yarn workspace @webex/cc-components run test:styles

# Auto-fix linting issues
yarn workspace @webex/cc-components run test:styles --fix
```

## Cleaning

```bash
# Clean all dist folders
yarn run clean:dist

# Clean everything (including node_modules)
yarn run clean

# Clean and rebuild
yarn run clean
yarn install
yarn run build

# Clean specific package
yarn workspace @webex/cc-components run clean:dist
yarn workspace @webex/cc-components run clean
```

## Git & Version Control

```bash
# Check status
git status

# Create new branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit (triggers pre-commit hooks)
git commit -m "feat: add new feature"

# Push changes
git push origin feature/my-feature

# Pull latest changes
git pull upstream ccwidgets

# Sync fork with upstream
git fetch upstream
git merge upstream/ccwidgets
```

## Package Management

```bash
# Add dependency to specific package
yarn workspace @webex/cc-components add package-name

# Add dev dependency
yarn workspace @webex/cc-components add -D package-name

# Remove dependency
yarn workspace @webex/cc-components remove package-name

# Update dependencies
yarn upgrade-interactive

# Check for outdated packages
yarn outdated
```

## TypeScript

```bash
# Type check all packages
yarn run -T tsc

# Type check specific package
yarn workspace @webex/cc-components run build

# Watch type checking
yarn workspace @webex/cc-components run build -- --watch
```

## Debugging

```bash
# Verbose build output
yarn workspace @webex/cc-components run build:src -- --verbose

# Webpack with stats
yarn workspace @webex/cc-components run build:src -- --json > stats.json

# Profile build
yarn workspace @webex/cc-components run build:src -- --profile

# Debug Jest tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Publishing

```bash
# Trigger semantic release
yarn release:widgets
```

## Environment & Node

```bash
# Check Node version
node --version

# Check Yarn version
yarn --version

# Enable Corepack (for Yarn)
corepack enable

# Activate specific Yarn version
corepack prepare yarn@4.5.1 --activate

# Increase Node memory for large builds
NODE_OPTIONS=--max-old-space-size=4096 yarn run build
```

## Workspace Commands

```bash
# List all workspaces
yarn workspaces list

# Run command in all workspaces
yarn workspaces foreach run build

# Run command in parallel
yarn workspaces foreach --parallel run build

# Run in topological order (respecting dependencies)
yarn workspaces foreach --topological run build

# Get workspace info
yarn workspace @webex/cc-components info
```

## Common Command Combinations

```bash
# Fresh start (clean everything and rebuild)
yarn run clean && yarn install && yarn run build

# Quick development setup
yarn install && yarn run build && yarn samples:serve-react

# Build store and dependent packages
yarn workspace @webex/cc-store run build:src && \
yarn workspace @webex/cc-components run build:src && \
yarn workspace @webex/cc-widgets run build:src

# Run all tests
yarn run test:cc-widgets && yarn run test:styles && yarn run test:e2e

# Pre-commit checks
yarn run test:cc-widgets && yarn run test:styles

# Build samples for deployment
yarn run build:prod && yarn samples:build
```

## Useful Shortcuts

### Development Workflow

```bash
# Terminal 1: Watch and rebuild
yarn workspace @webex/cc-components run build:watch

# Terminal 2: Run sample app
yarn samples:serve-react

# Terminal 3: Run tests in watch mode
yarn workspace @webex/cc-components run test:unit --watch
```

### Quick Component Creation

```bash
# Create component directory
cd packages/contact-center/cc-components/src/components
mkdir MyComponent && cd MyComponent
touch my-component.tsx my-component.types.ts my-component.utils.ts my-component.style.scss

# Build and test
yarn workspace @webex/cc-components run build:src
yarn samples:serve-react
```

### Troubleshooting

```bash
# If build fails, try building in order
yarn workspace @webex/cc-store run build:src
yarn workspace @webex/cc-ui-logging run build:src
yarn workspace @webex/cc-components run build:src

# If tests fail with module errors
yarn install
yarn run build

# If sample app doesn't reflect changes
yarn workspace @webex/cc-components run build:src
# Then refresh browser

# If TypeScript errors in IDE
# Restart TypeScript server in VS Code:
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Components",
      "type": "shell",
      "command": "yarn workspace @webex/cc-components run build:src",
      "group": "build"
    },
    {
      "label": "Watch Components",
      "type": "shell",
      "command": "yarn workspace @webex/cc-components run build:watch",
      "isBackground": true
    },
    {
      "label": "Serve React Samples",
      "type": "shell",
      "command": "yarn samples:serve-react",
      "isBackground": true
    },
    {
      "label": "Run Unit Tests",
      "type": "shell",
      "command": "yarn run test:cc-widgets",
      "group": "test"
    }
  ]
}
```

## Environment Variables

```bash
# Set Node environment
NODE_ENV=development yarn run build
NODE_ENV=production yarn run build

# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 yarn run build

# For E2E tests (in .env file)
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
USER1_USERNAME=agent@example.com
USER1_PASSWORD=password
USER1_DN=1234567890
USER1_TEAM=Support
```

## Help Commands

```bash
# Yarn help
yarn help

# Workspace help
yarn workspace --help

# Package-specific help
yarn workspace @webex/cc-components run --help

# Playwright help
yarn playwright help

# Jest help
yarn test --help
```

---

**Tip**: Add commonly used commands as aliases in your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias yb="yarn run build"
alias ybd="yarn run build:dev"
alias ys="yarn samples:serve-react"
alias yt="yarn run test:cc-widgets"
alias yte="yarn run test:e2e"
```
