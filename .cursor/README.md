# Cursor AI Documentation

This directory contains comprehensive documentation for the Webex Contact Center Widgets repository, specifically organized to help Cursor AI (and developers) understand and work with the codebase effectively.

## 📂 Documentation Files

| File                         | Purpose                                        | When to Use                                       |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| **overview.md**              | Project overview, architecture, tech stack     | First time setup, understanding project structure |
| **setup.md**                 | Installation, prerequisites, environment setup | Setting up dev environment for first time         |
| **development-workflow.md**  | Daily development commands, build process      | Daily development, making changes                 |
| **component-patterns.md**    | Component structure, design patterns           | Creating new components, following conventions    |
| **state-management.md**      | MobX store patterns, reactive state            | Working with store, state updates                 |
| **unit-testing.md**          | Jest & React Testing Library patterns          | Writing unit tests                                |
| **e2e-testing.md**           | Playwright E2E testing                         | Writing end-to-end tests                          |
| **build-and-webpack.md**     | Webpack config, build system                   | Build issues, understanding bundling              |
| **code-standards.md**        | TypeScript, React, style conventions           | Code review, maintaining consistency              |
| **commands-reference.md**    | Quick command cheatsheet                       | Quick lookup for commands                         |
| **troubleshooting.md**       | Common issues and solutions                    | Debugging problems                                |
| **WIDGET-EXPOSURE-GUIDE.md** | Widget exposure & testing workflow             | Exposing widgets, testing in sample app           |

## 🎯 How to Use This Documentation

### For Cursor AI

The `.cursorrules` file in the repository root points to these documentation files. When assisting with code:

1. **Reference appropriate docs** - Direct users to specific `.cursor/*.md` files
2. **Follow patterns** - Use examples from documentation as templates
3. **Check standards** - Ensure suggestions match `code-standards.md`
4. **Understand context** - Read relevant docs before suggesting solutions

### For Developers

1. **Start with** `overview.md` - Understand the project
2. **Follow** `setup.md` - Get environment running
3. **Reference** topic-specific files as needed
4. **Use** `commands-reference.md` for quick lookups

## 📋 Documentation Coverage

### Complete Coverage ✅

- [x] Project overview and structure
- [x] Initial setup and installation
- [x] Component creation patterns
- [x] State management with MobX
- [x] Unit testing with Jest
- [x] E2E testing with Playwright
- [x] Build system and Webpack
- [x] Development workflow
- [x] Code standards

### To Be Added 📝

- [ ] Troubleshooting guide (common issues)
- [ ] Commands quick reference
- [ ] API integration patterns
- [ ] Performance optimization
- [ ] CI/CD pipeline
- [ ] Release process
- [ ] Migration guides

## 🔄 Keeping Documentation Updated

### When to Update:

- New features added
- Build process changes
- Dependencies updated
- New patterns established
- Common issues discovered

### How to Update:

1. Edit relevant `.cursor/*.md` file
2. Keep examples accurate and tested
3. Update `.cursorrules` if structure changes
4. Maintain consistency across files

## 🤝 Contributing to Documentation

When adding or updating documentation:

### Structure:

- Use clear headings (H1-H4)
- Include code examples
- Add ✅/❌ do's and don'ts
- Provide context and explanations

### Style:

- Be concise but complete
- Use code blocks with syntax highlighting
- Include command examples with comments
- Link to related sections

### Format:

````markdown
## Section Title

Brief introduction explaining what this covers.

### Subsection

Explanation with examples:

```typescript
// Example code with comments
const example = 'like this';
```
````

**Key points:**

- Point 1
- Point 2

```

## 📖 External Resources

- [Webex Widgets GitHub](https://github.com/webex/widgets)
- [Contributing Guide](../packages/contact-center/CONTRIBUTING.md)
- [NPM Package](https://www.npmjs.com/package/@webex/cc-widgets)
- [Momentum Design](https://momentum-design.github.io/momentum-design/)
- [MobX Documentation](https://mobx.js.org/)
- [Playwright Docs](https://playwright.dev/)

## 💡 Tips for Using These Docs

### Quick Navigation
Use your IDE's file search to quickly jump between documentation files:
- Cmd/Ctrl + P → type `.cursor/filename`

### Search Within Docs
Use your IDE's search to find specific topics across all docs:
- Cmd/Ctrl + Shift + F → search `.cursor/` directory

### Keep Docs Open
Keep frequently referenced docs open in tabs:
- `component-patterns.md` - when creating components
- `development-workflow.md` - for daily commands
- `commands-reference.md` - for quick lookups

## 🆘 Getting Help

If documentation is unclear or incomplete:
1. Check related sections in other docs
2. Look at actual code examples in `packages/contact-center/`
3. Review tests for usage patterns
4. Ask team lead or create GitHub issue

---

**Maintained by**: Webex Contact Center Widgets Team
**Last Updated**: November 2025

```
