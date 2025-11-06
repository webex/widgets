# Troubleshooting Guide

## Build Issues

### Issue: "Cannot find module '@webex/cc-store'"

**Symptoms**:

```
Error: Cannot find module '@webex/cc-store'
```

**Cause**: Store package not built or node_modules out of sync

**Solution**:

```bash
# Build store first
yarn workspace @webex/cc-store run build:src

# Then build dependent packages
yarn workspace @webex/cc-components run build:src

# Or rebuild everything
yarn run clean:dist
yarn run build
```

---

### Issue: Build fails with "Module not found: Error: Can't resolve 'fs'"

**Symptoms**:

```
Module not found: Error: Can't resolve 'fs'
```

**Cause**: Node.js module being used in browser code

**Solution**:
Add to webpack `resolve.fallback`:

```javascript
resolve: {
  fallback: {
    fs: false,  // fs cannot be used in browser
    path: false,
    crypto: require.resolve('crypto-browserify'),
  }
}
```

---

### Issue: "Out of memory" during build

**Symptoms**:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution**:

```bash
# Increase Node memory allocation
NODE_OPTIONS=--max-old-space-size=4096 yarn run build

# Or set permanently in package.json
"scripts": {
  "build": "NODE_OPTIONS=--max-old-space-size=4096 yarn workspaces foreach..."
}
```

---

### Issue: Sass deprecation warnings

**Symptoms**:

```
DeprecationWarning: config.stats.warningsFilter is deprecated
```

**Cause**: sass-loader using deprecated Sass features

**Solution**: These are already suppressed in webpack config. Safe to ignore.

---

### Issue: TypeScript errors but build succeeds

**Symptoms**: Red squiggly lines in IDE, but `yarn run build` works

**Solution**:

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild packages
yarn run build

# Check tsconfig.json is correct
```

---

### Issue: Changes not reflecting in sample app

**Symptoms**: Made changes but sample app shows old code

**Solution**:

```bash
# Rebuild the changed package
yarn workspace @webex/cc-components run build:src

# If using watch mode, check if it's still running
yarn workspace @webex/cc-components run build:watch

# Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

# If still not working, restart sample app
# Ctrl+C to stop, then:
yarn samples:serve-react
```

---

## Dependency Issues

### Issue: Yarn version mismatch

**Symptoms**:

```
error Invalid version: Expected @webex/cc-widgets@workspace:*
```

**Solution**:

```bash
# Enable Corepack
corepack enable

# Install correct Yarn version
corepack prepare yarn@4.5.1 --activate

# Verify version
yarn --version  # Should be 4.5.1
```

---

### Issue: Conflicting peer dependencies

**Symptoms**:

```
warning "package-a@x.x.x" has incorrect peer dependency "package-b@^y.y.y"
```

**Solution**:
Add to root `package.json`:

```json
{
  "resolutions": {
    "@momentum-design/components": "0.53.8",
    "@momentum-design/icons": "0.17.0"
  }
}
```

Then:

```bash
yarn install
```

---

### Issue: Package not found after adding dependency

**Symptoms**: Added package but can't import it

**Solution**:

```bash
# Ensure you added to correct workspace
yarn workspace @webex/cc-components add package-name

# Not to root
yarn add package-name  # Wrong!

# Rebuild after adding dependency
yarn workspace @webex/cc-components run build:src
```

---

## Testing Issues

### Issue: Jest tests fail with "Cannot find module"

**Symptoms**:

```
Cannot find module '@webex/cc-store' from 'src/components/MyComponent.tsx'
```

**Solution**:

```bash
# Ensure all packages are built
yarn run build

# Clear Jest cache
yarn workspace @webex/cc-components run test:unit --clearCache

# Check transformIgnorePatterns in jest.config.js
```

---

### Issue: Playwright tests timeout

**Symptoms**:

```
Error: Test timeout of 180000ms exceeded
```

**Solutions**:

```bash
# Check if sample app is running
curl http://localhost:3000  # Should return HTML

# Verify credentials in .env file
cat .env

# Increase timeout in playwright.config.ts
timeout: 300000  # 5 minutes

# Run single test to debug
yarn playwright test --debug playwright/tests/station-login-test.spec.ts
```

---

### Issue: 429 Too Many Requests during E2E tests

**Symptoms**: Tests fail with 429 HTTP status

**Cause**: Too many login attempts or API calls

**Solution**:

```bash
# Add delays between tests
await page.waitForTimeout(2000);

# Reduce number of parallel tests
workers: 2  # In playwright.config.ts

# Contact backend team about rate limits
```

---

### Issue: Mock not working in tests

**Symptoms**: Real module called instead of mock

**Solution**:

```typescript
// Mock before imports
jest.mock('@webex/cc-store', () => ({
  Store: {
    getInstance: jest.fn(() => ({
      someState: 'test',
    })),
  },
}));

// Then import component
import {MyComponent} from './my-component';

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## Development Issues

### Issue: HMR not working in React samples

**Symptoms**: Changes require manual refresh

**Solution**:

```bash
# Ensure using React samples (not web components)
yarn samples:serve-react

# Check if package is in watch mode
yarn workspace @webex/cc-components run build:watch

# Restart dev server
# Ctrl+C, then:
yarn samples:serve-react
```

---

### Issue: Store changes not reflecting

**Symptoms**: Modified store but components show old state

**Solution**:

```bash
# Rebuild store
yarn workspace @webex/cc-store run build:src

# Rebuild all dependent packages
yarn workspace @webex/cc-components run build:src
yarn workspace @webex/cc-widgets run build:src

# Refresh browser with cache clear (Cmd+Shift+R)
```

---

### Issue: Linting errors on commit

**Symptoms**: Commit rejected due to ESLint errors

**Solution**:

```bash
# Fix auto-fixable issues
yarn workspace @webex/cc-components run test:styles --fix

# Run linting to see remaining issues
yarn workspace @webex/cc-components run test:styles

# Fix manually, then commit
git add .
git commit -m "fix: resolve linting issues"
```

---

### Issue: Husky hooks not running

**Symptoms**: Commits succeed without running pre-commit checks

**Solution**:

```bash
# Reinstall Husky hooks
yarn run prepare

# Or manually
npx husky install

# Verify hooks exist
ls -la .husky/pre-commit
```

---

## IDE Issues

### Issue: TypeScript "Cannot find name" errors

**Symptoms**: IDE shows errors like `Cannot find name 'React'`

**Solution**:

```bash
# Install type definitions
yarn workspace @webex/cc-components add -D @types/react @types/react-dom

# Ensure tsconfig.json includes types
"types": ["jest", "node"]

# Restart TypeScript server
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Issue: Import auto-completion not working

**Symptoms**: Auto-import suggestions missing

**Solution**:

```javascript
// Add to .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

Then restart VS Code.

---

### Issue: ESLint not showing errors in IDE

**Symptoms**: Linting errors only show on commit/CI

**Solution**:

```javascript
// Add to .vscode/settings.json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

Install ESLint extension for VS Code.

---

## Runtime Issues

### Issue: "Webex SDK not initialized" error

**Symptoms**:

```
Error: Webex SDK not initialized
```

**Cause**: Store not registered with Webex SDK

**Solution**:

```typescript
// In sample app initialization
import {Store} from '@webex/cc-store';
import Webex from 'webex';

const webex = await Webex.init({credentials: {access_token}});
const store = Store.getInstance();
await store.registerCC(webex); // Important!
```

---

### Issue: Components not rendering

**Symptoms**: White screen or components don't appear

**Solution**:

```typescript
// Ensure components wrapped in Momentum providers
import { ThemeProvider, IconProvider } from '@momentum-design/components/dist/react';

<ThemeProvider theme="light">
  <IconProvider>
    <YourComponents />
  </IconProvider>
</ThemeProvider>

// Check browser console for errors
// Open DevTools → Console tab
```

---

### Issue: MobX store not updating UI

**Symptoms**: Store changes but component doesn't re-render

**Solution**:

```typescript
// Wrap component with observer
import { observer } from 'mobx-react-lite';

const MyComponent = observer(() => {
  const store = Store.getInstance();
  return <div>{store.someState}</div>;
});

// NOT:
const MyComponent = () => {
  const store = Store.getInstance();
  return <div>{store.someState}</div>;  // Won't update!
};
```

---

### Issue: Momentum icons not showing

**Symptoms**: Icons appear as broken or missing

**Solution**:

```typescript
// Ensure IconProvider wraps components
import { IconProvider } from '@momentum-design/components/dist/react';

<IconProvider>
  <Button>
    <Icon name="check" />
  </Button>
</IconProvider>

// Check resolutions in package.json
"resolutions": {
  "@momentum-design/icons": "0.17.0"
}
```

---

## Git Issues

### Issue: Pre-commit hooks fail

**Symptoms**: Cannot commit due to hook failures

**Solution**:

```bash
# See what's failing
git commit -m "test"

# If tests fail, fix and retry
yarn run test:cc-widgets
yarn run test:styles

# If urgent, skip hooks (NOT RECOMMENDED)
git commit -m "test" --no-verify
```

---

### Issue: Merge conflicts in yarn.lock

**Symptoms**: Conflicts in yarn.lock file

**Solution**:

```bash
# Accept their version
git checkout --theirs yarn.lock

# Regenerate lock file
yarn install

# Add and commit
git add yarn.lock
git commit -m "chore: regenerate yarn.lock"
```

---

## Performance Issues

### Issue: Build takes too long

**Symptoms**: Builds taking >2 minutes

**Solutions**:

```bash
# Use parallel build
yarn run build:dev  # Instead of build:prod

# Enable webpack cache (in webpack.config.js)
cache: { type: 'filesystem' }

# Use watch mode for active development
yarn workspace @webex/cc-components run build:watch

# Increase Node memory
NODE_OPTIONS=--max-old-space-size=8192 yarn run build
```

---

### Issue: Sample app loads slowly

**Symptoms**: Long initial load time in browser

**Solutions**:

- Use development build (faster, larger bundles)
- Check browser DevTools → Network tab for slow resources
- Disable source maps in webpack config for faster builds
- Use production build for actual performance testing

---

## Getting More Help

### Check These First:

1. Search this troubleshooting guide
2. Check relevant `.cursor/*.md` documentation
3. Look at test files for usage examples
4. Review recent commits for similar changes

### Still Stuck?

1. Check browser console for errors
2. Check terminal output for build errors
3. Enable verbose logging: `yarn run build:src -- --verbose`
4. Search GitHub issues: https://github.com/webex/widgets/issues
5. Ask team lead or create new GitHub issue

### Useful Debug Commands:

```bash
# Verbose build
yarn workspace @webex/cc-components run build:src -- --verbose

# Check dependency tree
yarn why package-name

# List all workspaces
yarn workspaces list

# Workspace info
yarn workspace @webex/cc-components info

# Check Node/Yarn versions
node --version
yarn --version
```

---

**Remember**: When in doubt, try the "clean slate" approach:

```bash
yarn run clean
yarn install
yarn run build
```

This resolves ~70% of issues!
