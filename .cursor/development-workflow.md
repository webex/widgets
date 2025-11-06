# Development Workflow

## Daily Development Commands

### Building Packages

```bash
# Development build (parallel, faster)
yarn run build:dev

# Production build (sequential, more stable)
yarn run build:prod

# Build specific package
yarn workspace @webex/cc-components run build:src
yarn workspace @webex/cc-store run build:src

# Watch mode for active development
yarn workspace @webex/cc-components run build:watch
```

**Build Order** (if building manually):
1. `@webex/cc-store`
2. `@webex/cc-ui-logging`
3. `@webex/cc-components`
4. `@webex/cc-station-login`, `@webex/cc-task`, `@webex/cc-user-state`
5. `@webex/cc-widgets`

### Running Sample Applications

#### React Sample App (Recommended for Development)

```bash
# First time setup
yarn install
yarn run build
yarn samples:build

# Start development server with HMR
yarn samples:serve-react
```

Opens: http://localhost:3000

**Hot Module Replacement (HMR)**:
- `.scss/.css` changes: **Instant hot reload** ✨
- `.ts/.tsx/.js/.jsx` changes: **Full page reload**

⚠️ **Warning**: Excessive reloads can cause 429 (Too Many Requests) errors from backend

#### Web Components Sample App

```bash
# Build samples
yarn samples:build

# Serve web components
yarn samples:serve-wc
```

Opens: http://localhost:8080

#### Static Samples

```bash
# Build all samples
yarn samples:build

# Serve static files
yarn samples:serve
```

Opens: http://localhost:8080

## Typical Development Flow

### Making Changes to Components

1. **Edit component files**:
   ```bash
   # Edit files in packages/contact-center/cc-components/src/
   ```

2. **Rebuild the package**:
   ```bash
   yarn workspace @webex/cc-components run build:src
   ```

3. **View changes**:
   - If React sample is running with HMR, it auto-reloads
   - Otherwise, refresh browser

### Using Watch Mode

For active development on a single package:

```bash
# Terminal 1: Watch and rebuild on changes
yarn workspace @webex/cc-components run build:watch

# Terminal 2: Run sample app
yarn samples:serve-react
```

Changes are automatically rebuilt and reflected in the sample app.

### Making Changes to Store

**IMPORTANT**: Store is a dependency for many packages!

1. **Edit store files**:
   ```bash
   # Edit packages/contact-center/store/src/
   ```

2. **Rebuild store and dependent packages**:
   ```bash
   yarn workspace @webex/cc-store run build:src
   yarn workspace @webex/cc-components run build:src
   yarn workspace @webex/cc-widgets run build:src
   ```

3. **Test changes**:
   ```bash
   yarn samples:serve-react
   ```

### Adding New Component

1. **Create component structure**:
   ```bash
   cd packages/contact-center/cc-components/src/components
   mkdir MyNewComponent
   cd MyNewComponent
   touch my-new-component.tsx
   touch my-new-component.types.ts
   touch my-new-component.utils.ts
   touch my-new-component.style.scss
   ```

2. **Implement component** (see `component-patterns.md`)

3. **Export component**:
   ```typescript
   // packages/contact-center/cc-components/src/index.ts
   export { MyNewComponent } from './components/MyNewComponent/my-new-component';
   export type { MyNewComponentProps } from './components/MyNewComponent/my-new-component.types';
   ```

4. **For Web Components**:
   ```typescript
   // packages/contact-center/cc-components/src/wc.ts
   import r2wc from '@r2wc/react-to-web-component';
   import { MyNewComponent } from './components/MyNewComponent/my-new-component';

   const MyNewComponentWC = r2wc(MyNewComponent, {
     props: {
       someProp: 'string',
       anotherProp: 'json',
     },
   });

   customElements.define('widget-my-new-component', MyNewComponentWC);
   ```

5. **Build and test**:
   ```bash
   yarn workspace @webex/cc-components run build:src
   yarn samples:serve-react
   ```

6. **Add tests** (see `unit-testing.md`)

7. **Use in sample app**:
   ```typescript
   // widgets-samples/cc/samples-cc-react-app/src/App.tsx
   import { MyNewComponent } from '@webex/cc-components';

   <MyNewComponent someProp="value" />
   ```

## Testing During Development

### Unit Tests

```bash
# Run all tests
yarn run test:cc-widgets

# Run tests for specific package
yarn workspace @webex/cc-components run test:unit

# Watch mode
yarn workspace @webex/cc-components run test:unit --watch

# With coverage
yarn workspace @webex/cc-components run test:unit --coverage
```

### Linting

```bash
# Run linting on all packages
yarn run test:styles

# Lint specific package
yarn workspace @webex/cc-components run test:styles

# Auto-fix issues
yarn workspace @webex/cc-components run test:styles --fix
```

### E2E Tests

```bash
# Run all E2E tests
yarn run test:e2e

# Run specific test
yarn playwright test playwright/tests/station-login-test.spec.ts

# Debug mode
yarn playwright test --debug
```

## Cleaning

### Clean Distribution Folders

```bash
# Clean all dist folders
yarn run clean:dist

# Clean specific package
yarn workspace @webex/cc-components run clean:dist
```

### Full Clean

```bash
# Remove all dist folders and node_modules
yarn run clean

# Reinstall and rebuild
yarn install
yarn run build
```

## Git Workflow

### Before Committing

1. **Run tests**:
   ```bash
   yarn run test:cc-widgets
   yarn run test:styles
   ```

2. **Fix linting issues**:
   ```bash
   yarn run test:styles --fix
   ```

3. **Stage changes**:
   ```bash
   git add .
   ```

4. **Commit** (Husky runs pre-commit hooks):
   ```bash
   git commit -m "feat: add new component"
   ```

**Commit Message Format** (Conventional Commits):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/tooling changes

### Creating Pull Request

1. **Push to remote**:
   ```bash
   git push origin your-branch-name
   ```

2. **Create PR** on GitHub

3. **Ensure CI passes**:
   - Unit tests
   - Linting
   - Build success

## Debugging

### Browser DevTools

With React sample app running:

1. Open http://localhost:3000
2. Open DevTools (F12)
3. Use React DevTools extension
4. Check Console for errors
5. Use Network tab for API calls

### MobX DevTools

Install MobX DevTools browser extension to:
- Inspect store state
- Track state changes
- Debug reactions

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Performance Profiling

### React Profiler

```typescript
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={callback}>
  <MyComponent />
</Profiler>
```

### Bundle Analysis

```bash
# Analyze bundle size
yarn workspace @webex/cc-widgets run build:src -- --analyze
```

## Common Development Scenarios

### Scenario 1: Quick Fix in Component

```bash
# 1. Edit component
vim packages/contact-center/cc-components/src/components/MyComponent/my-component.tsx

# 2. Rebuild
yarn workspace @webex/cc-components run build:src

# 3. Test in sample app (if not already running)
yarn samples:serve-react

# 4. Run tests
yarn workspace @webex/cc-components run test:unit -- MyComponent

# 5. Commit
git add .
git commit -m "fix: correct button alignment in MyComponent"
```

### Scenario 2: Adding New Feature with Store Changes

```bash
# 1. Edit store
vim packages/contact-center/store/src/store.ts
vim packages/contact-center/store/src/store.types.ts

# 2. Rebuild store
yarn workspace @webex/cc-store run build:src

# 3. Edit component
vim packages/contact-center/cc-components/src/components/MyComponent/my-component.tsx

# 4. Rebuild component
yarn workspace @webex/cc-components run build:src

# 5. Test
yarn samples:serve-react
yarn run test:cc-widgets

# 6. Commit
git add .
git commit -m "feat: add new feature with store integration"
```

### Scenario 3: Working on Multiple Packages

```bash
# Use watch mode for active package
# Terminal 1
yarn workspace @webex/cc-components run build:watch

# Terminal 2
yarn samples:serve-react

# Terminal 3 (for running tests)
yarn workspace @webex/cc-components run test:unit --watch
```

## IDE Setup for Development

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

### Recommended Extensions

- ESLint
- Prettier - Code formatter
- TypeScript and JavaScript Language Features
- SCSS IntelliSense
- Jest Runner
- Playwright Test for VS Code
- MobX DevTools (browser extension)

## Troubleshooting Development Issues

See `troubleshooting.md` for detailed solutions to common development issues.

## Next Steps

- See `component-patterns.md` for component creation
- See `unit-testing.md` for testing
- See `troubleshooting.md` for common issues
- See `commands-reference.md` for quick command lookup

