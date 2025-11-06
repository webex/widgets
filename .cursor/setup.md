# Initial Setup

## Prerequisites

### Required Software

- **Node.js**: v18+ (recommended)
- **Yarn**: v4.5.1+ (must use Yarn, **NEVER npm**)
- **Git**: Latest stable version

### Recommended IDE Setup

**VS Code** with extensions:

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- SCSS IntelliSense
- Playwright Test for VS Code (optional)

## Installation Steps

### 1. Clone the Repository

```bash
git clone git@github.com:webex/widgets.git
cd widgets
```

### 2. Install Dependencies

```bash
yarn install
```

⚠️ **IMPORTANT**: Always use `yarn`, never `npm install`

### 3. Build All Packages

```bash
yarn run build
```

This builds all packages in the correct dependency order:

1. @webex/cc-store
2. @webex/cc-ui-logging
3. @webex/cc-components
4. @webex/cc-station-login, @webex/cc-task, @webex/cc-user-state
5. @webex/cc-widgets

**Build Time**: First build takes ~30-40 seconds

## Environment Variables

### For E2E Tests

Create a `.env` file in the repository root:

```bash
# OAuth credentials for Playwright tests
# Contact team lead for actual values
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
REFRESH_TOKEN=your_refresh_token
# Add other user credentials as needed
```

⚠️ **NEVER commit the `.env` file** - it's already in `.gitignore`

## Verify Setup

### 1. Check Build Success

After running `yarn run build`, verify all packages built successfully:

- No error messages in terminal
- `dist/` folders created in each package

### 2. Run Sample Application

```bash
yarn samples:build
yarn samples:serve-react
```

Open http://localhost:3000 - you should see the widgets sample app

### 3. Run Tests (Optional)

```bash
# Unit tests
yarn run test:cc-widgets

# Linting
yarn run test:styles
```

## Common Setup Issues

### Issue: Build Fails with "Cannot find module @webex/cc-store"

**Solution**:

```bash
yarn workspace @webex/cc-store run build:src
yarn run build
```

### Issue: Yarn version mismatch

**Solution**:

```bash
# Enable Corepack (Node.js 16.10+)
corepack enable

# Install correct Yarn version
corepack prepare yarn@4.5.1 --activate
```

### Issue: TypeScript errors in IDE

**Solution**:

1. Restart TypeScript server in VS Code (Cmd+Shift+P → "TypeScript: Restart TS Server")
2. Rebuild: `yarn run build`
3. Close and reopen VS Code

### Issue: Husky hooks not working

**Solution**:

```bash
yarn run prepare
```

## Next Steps

- See `development-workflow.md` for daily development commands
- See `component-patterns.md` to start creating components
- See `unit-testing.md` and `e2e-testing.md` for testing guidelines
