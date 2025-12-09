# OutdialCall Component - AI Agent Guide

## Overview

The OutdialCall component is part of the `@webex/cc-components` package (v1.28.0-ccwidgets.126) and provides a dialpad UI for agents to initiate outbound calls in Webex Contact Center solutions. It supports both manual dialing and address book functionality.

## Package Information

- **Package Name**: `@webex/cc-components`
- **Description**: Webex Contact Center UI Components Library for your custom contact center solutions
- **License**: Cisco's General Terms
- **Main Entry**: `dist/index.js`
- **Types**: `dist/types/index.d.ts`

## Component Location

```
packages/contact-center/cc-components/src/components/task/OutdialCall/
├── outdial-call.tsx          # Main component implementation
├── outdial-call.style.scss   # Component styles
├── constants.ts              # String constants and utilities
└── AGENTS.md                 # This file
```

## Available Commands

### From Repository Root (`/Volumes/data/repo/cisco/widgets-repos/cc-widgets`)

#### Run Tests

```bash
# Run all unit tests for cc-components package
yarn workspace @webex/cc-components run test:unit

# Run specific test file
yarn workspace @webex/cc-components run test:unit packages/contact-center/cc-components/tests/components/task/OutdialCall/out-dial-call.tsx

# Run snapshot tests
yarn workspace @webex/cc-components run test:unit packages/contact-center/cc-components/tests/components/task/OutdialCall/out-dial-call.snapshot.tsx
```

#### Build Commands

```bash
# Build TypeScript types
yarn workspace @webex/cc-components run build

# Build source with webpack
yarn workspace @webex/cc-components run build:src

# Watch mode for development
yarn workspace @webex/cc-components run build:watch
```

#### Code Quality

```bash
# Run ESLint for style checking
yarn workspace @webex/cc-components run test:styles
```

#### Clean Commands

```bash
# Clean dist and node_modules
yarn workspace @webex/cc-components run clean

# Clean only dist folder
yarn workspace @webex/cc-components run clean:dist
```

### From Package Directory (`packages/contact-center/cc-components`)

```bash
# Run tests
yarn test:unit

# Build
yarn build
yarn build:src
yarn build:watch

# Linting
yarn test:styles

# Clean
yarn clean
yarn clean:dist
```

## Component Features

### Core Functionality

1. **Dial Pad**: Manual number entry using keypad or direct input
2. **Address Book**: Search and select contacts (when enabled)
3. **ANI Selection**: Choose outbound calling line identity
4. **Input Validation**: Validates phone number format using regex
5. **Tab Navigation**: Switch between Dial Pad and Address Book views

### Key Props (OutdialCallComponentProps)

- `logger`: Logger instance for tracking
- `startOutdial`: Function to initiate outbound call
- `getOutdialANIEntries`: Fetch available ANI entries
- `isTelephonyTaskActive`: Disable calling when telephony task is active
- `getAddressBookEntries`: Fetch address book contacts (optional)
- `isAddressBookEnabled`: Enable/disable address book feature (optional)

### Constants

Located in `constants.ts`:

- **OutdialStrings**: UI labels and messages
  - `ANI_SELECT_LABEL`, `ANI_SELECT_PLACEHOLDER`
  - `CALL_BUTTON_ARIA_LABEL`
  - `DN_PLACEHOLDER`, `INCORRECT_DN_FORMAT`
  - `OUTDIAL_CALL`
  - `ADDRESS_BOOK_SEARCH_PLACEHOLDER`
- **KEY_LIST**: Dialpad keys `['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']`

## Testing

### Test Files Location

```
packages/contact-center/cc-components/tests/components/task/OutdialCall/
├── out-dial-call.tsx          # Functional tests
└── out-dial-call.snapshot.tsx # Snapshot tests
```

### Test Requirements

When creating or modifying tests, always include:

1. **Required Props**: All test components must have:

   - `logger`
   - `startOutdial`
   - `getOutdialANIEntries`
   - `isTelephonyTaskActive`
   - `getAddressBookEntries`
   - `isAddressBookEnabled`

2. **Mock Setup**: Use `@webex/test-fixtures` for mocking

   ```typescript
   import {mockCC} from '@webex/test-fixtures';
   store.store.logger = mockCC.LoggerProxy;
   ```

3. **Snapshot Testing**: Remove dynamic IDs before snapshots
   ```typescript
   container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
   ```

### Test Coverage Areas

- ✅ Basic rendering and layout
- ✅ Keypad input and validation
- ✅ Direct number input
- ✅ ANI selection
- ✅ Call button functionality
- ✅ Invalid input handling
- ✅ Address book tab switching
- ✅ Address book entry selection
- ✅ Address book search
- ✅ Empty states

## Development Workflow

### 1. Type Checking

Before running tests, TypeScript compilation must pass:

```bash
cd packages/contact-center/cc-components
yarn run -T tsc --project tsconfig.test.json
```

### 2. Making Changes

1. Edit component files in `src/components/task/OutdialCall/`
2. Update tests in `tests/components/task/OutdialCall/`
3. Run type checking
4. Run tests
5. Fix any failing tests or type errors

### 3. Common Issues

#### Missing Props Error

```
Type '{ ... }' is missing the following properties from type 'OutdialCallComponentProps': getAddressBookEntries, isAddressBookEnabled
```

**Solution**: Add missing props to test component instantiation:

```typescript
const props: OutdialCallComponentProps = {
  logger: mockCC.LoggerProxy,
  startOutdial: jest.fn(),
  getOutdialANIEntries: jest.fn().mockResolvedValue([]),
  isTelephonyTaskActive: false,
  getAddressBookEntries: jest.fn().mockResolvedValue([]),
  isAddressBookEnabled: false,
};
```

#### Jest Module Errors

If you encounter `Cannot find module '@jest/test-sequencer'` or similar:

```bash
# From repository root
yarn install
```

## Dependencies

### Runtime Dependencies

- `@momentum-ui/illustrations`: ^1.24.0
- `@r2wc/react-to-web-component`: 2.0.3
- `@webex/cc-store`: workspace package
- `@webex/cc-ui-logging`: workspace package

### Peer Dependencies (Required by consumer)

- `@momentum-ui/react-collaboration`: >=26.197.0
- `react`: >=18.3.1
- `react-dom`: >=18.3.1

### Dev Dependencies

- Testing: Jest 29.7.0, @testing-library/react 16.0.1
- Build: TypeScript 5.6.3, Webpack 5.94.0
- Linting: ESLint 9.20.1, Prettier 3.5.1

## Type Definitions

Component types are defined in:

```
packages/contact-center/cc-components/src/components/task/task.types.ts
```

Look for:

- `OutdialCallComponentProps`
- `OutdialAniEntry`
- `AddressBookEntry` (from `@webex/contact-center`)

## Best Practices

### For Component Development

1. Always validate phone number input using the regex pattern
2. Handle async operations with proper error logging
3. Use debounce for search inputs (500ms)
4. Implement infinite scroll for large address books
5. Clear states when switching between tabs

### For Testing

1. Always compile TypeScript before running tests
2. Mock all async operations
3. Test both enabled and disabled address book scenarios
4. Verify accessibility attributes (aria-label, role, tabindex)
5. Test error states and edge cases

### For Code Review

1. Ensure all new props are added to type definitions
2. Update tests when adding new features
3. Verify snapshot tests capture new UI elements
4. Check that error messages are logged appropriately

## Related Files

- Type definitions: `../task.types.ts`
- Helper utilities: `../CallControl/CallControlCustom/call-control-custom.utils.ts`
- Constants: `../constants.ts` (DEFAULT_PAGE_SIZE)
- Store integration: `@webex/cc-store`

## Troubleshooting

### Tests Not Running

1. Check TypeScript compilation: `yarn run -T tsc --project tsconfig.test.json`
2. Verify all dependencies installed: `yarn install`
3. Check Jest configuration: `jest.config.js` in package root

### Type Errors in Tests

1. Ensure test file imports correct types from `task.types.ts`
2. Verify all required props are provided
3. Check that mock return values match expected types

### Snapshot Mismatches

1. Review changes carefully
2. Update snapshots if changes are intentional: `jest --updateSnapshot`
3. Remember to remove dynamic IDs before creating snapshots

## Quick Reference

| Action            | Command                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Run all tests     | `yarn workspace @webex/cc-components run test:unit`                                        |
| Run specific test | `yarn workspace @webex/cc-components run test:unit <path-to-test-file>`                    |
| Build component   | `yarn workspace @webex/cc-components run build:src`                                        |
| Watch mode        | `yarn workspace @webex/cc-components run build:watch`                                      |
| Type check        | `cd packages/contact-center/cc-components && yarn run -T tsc --project tsconfig.test.json` |
| Lint code         | `yarn workspace @webex/cc-components run test:styles`                                      |
| Clean build       | `yarn workspace @webex/cc-components run clean:dist`                                       |

## Support

For questions about Webex Contact Center components, refer to the main package documentation or contact the development team.
