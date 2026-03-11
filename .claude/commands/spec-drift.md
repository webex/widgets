# Spec Drift Detection — Full Scan

Run a comprehensive validation of all SDD ai-docs against actual source code. Deploys a parallel agent team to catch documentation drift across 7 categories.

## Step 1: Auto-Discovery

Detect repo type and discover all ai-docs:

1. **Repo detection**: This is ccWidgets — `packages/contact-center/` exists (no `@webex` scope)
2. **Root AGENTS.md**: `AGENTS.md` (repo root)
3. **Framework docs**: `ai-docs/` (README, RULES, patterns/*, templates/*)
4. **Package-level ai-docs**: Glob for `packages/contact-center/**/ai-docs/` to find all ai-docs folders
5. **Samples ai-docs**: Check `widgets-samples/**/ai-docs/` as well

For each ai-docs folder found, identify its corresponding source code directory (the parent directory of `ai-docs/`).

Build an inventory like:
```
ai-docs folder                                                    → source directory
packages/contact-center/store/ai-docs/                            → packages/contact-center/store/src/
packages/contact-center/cc-components/ai-docs/                    → packages/contact-center/cc-components/src/
packages/contact-center/cc-widgets/ai-docs/                       → packages/contact-center/cc-widgets/src/
packages/contact-center/station-login/ai-docs/                    → packages/contact-center/station-login/src/
packages/contact-center/task/ai-docs/widgets/CallControl/         → packages/contact-center/task/src/widgets/CallControl/
packages/contact-center/task/ai-docs/widgets/IncomingTask/        → packages/contact-center/task/src/widgets/IncomingTask/
packages/contact-center/task/ai-docs/widgets/OutdialCall/         → packages/contact-center/task/src/widgets/OutdialCall/
packages/contact-center/task/ai-docs/widgets/TaskList/            → packages/contact-center/task/src/widgets/TaskList/
packages/contact-center/user-state/ai-docs/                       → packages/contact-center/user-state/src/
packages/contact-center/ui-logging/ai-docs/                       → packages/contact-center/ui-logging/src/
packages/contact-center/test-fixtures/ai-docs/                    → packages/contact-center/test-fixtures/src/
widgets-samples/cc/samples-cc-react-app/ai-docs/                  → widgets-samples/cc/samples-cc-react-app/src/
... (discover all that exist on the current branch)
```

## Step 2: Spawn Checker Agents in Parallel

Use the Task tool to spawn agents. **All agents run in parallel.**

### Per-Package Checker Agents (one per ai-docs folder)

For EACH ai-docs folder discovered, spawn one Explore agent with this prompt:

```
You are validating SDD documentation accuracy.

SOURCE OF TRUTH (actual code): {source_code_directory}
DOCS TO VALIDATE: {ai_docs_folder}

Read every markdown file in the ai-docs folder. For each document, check these 7 categories:

### Category 1: FILE TREE
Read any documented file/directory trees in the docs. Glob the actual directory. Report:
- Files listed in docs but missing on disk
- Files on disk but missing from docs
- Wrong nesting or directory structure

### Category 2: METHOD/API SIGNATURES
For every method, function, or API endpoint documented:
- Read the actual source file
- Verify: method name, parameter names, parameter types, return type, access modifiers (public/private/static)
- Check if method actually exists in the documented file
- Flag any param that is documented but doesn't exist, or exists but isn't documented

### Category 3: TYPE DEFINITIONS
For every type, enum, interface, or constant documented:
- Find the actual definition in source (check package-level types files and shared types)
- Compare: name, fields/members, field types, enum values
- Flag missing fields, wrong types, renamed types

### Category 4: EVENT NAMES
For every event constant or observable referenced:
- Find the actual definition in source
- Verify the exact name matches
- For MobX observables: verify @observable, @computed, @action decorators match docs
- For React events: verify prop callback names match

### Category 5: ARCHITECTURE PATTERNS
For claims about architectural patterns, verify:
- MobX store patterns: Are @observable, @action, @computed correctly documented?
- React component patterns: Are props, state, lifecycle methods correct?
- Singleton vs factory: Is the instantiation pattern correct?
- Component hierarchy: Are parent-child relationships correct?
- Store injection patterns: Are MobX store injections accurately described?

### Category 6: LINK VALIDATION
For every relative markdown link [text](path):
- Resolve the path relative to the document's location
- Verify the target file exists on disk
- For anchor links (#section), verify the heading exists in the target

### Category 7: CODE EXAMPLES
For every inline code block or code snippet:
- Verify API names, method names, parameter names are correct
- Verify import paths are valid
- Check that documented usage patterns match actual API signatures
- Verify MobX patterns use correct decorators and patterns

## Output Format

For each finding, report:
- **File**: (path to the ai-docs file with the issue)
- **Line/Section**: (approximate line number or section heading)
- **Category**: (1-7 from above)
- **Severity**:
  - Blocking = wrong API that would cause runtime errors if AI agent follows the docs
  - Important = wrong params/types that would cause compilation errors
  - Medium = incomplete or stale info that would cause confusion
  - Minor = broken links, cosmetic issues
- **What doc says**: (quoted text from the doc)
- **What code actually has**: (evidence from source, with file path and line)
- **Suggested fix**: (exact replacement text)

If no issues found in a category, state "No issues found" for that category.
```

### Framework Agent

Spawn one additional Explore agent for root-level framework validation:

```
Validate the root-level SDD framework documents for ccWidgets:

1. **Root AGENTS.md** (repo root AGENTS.md):
   - Package Routing Table: Every package listed must exist on disk at the documented path
   - Every actual package directory under packages/contact-center/ should be listed
   - Task classification types must be consistent with template directories that exist
   - Quick Start Workflow steps must reference files that exist

2. **ai-docs/RULES.md**:
   - Test commands: Verify documented commands are correct
   - Naming conventions: Verify claims against actual code
   - Pattern references: All referenced patterns should exist

3. **ai-docs/README.md**:
   - File tree must match actual ai-docs directory structure
   - All referenced documents must exist

4. **ai-docs/patterns/*.md** (mobx-patterns, react-patterns, testing-patterns, typescript-patterns):
   - Each pattern file's code examples must match actual source conventions
   - MobX patterns must match actual decorator usage in stores
   - React patterns must match actual component patterns
   - Test patterns must reference correct commands and configs

5. **ai-docs/templates/**:
   - Cross-references to AGENTS.md sections must be valid
   - Referenced file paths in templates must exist
   - Workflow steps must be internally consistent

For each finding, report:
- **File**: (path)
- **Line/Section**: (section heading or line)
- **Category**: (1-7: File Tree, Method/API, Type Definition, Event Name, Architecture Pattern, Link Validation, Code Example)
- **Severity**: Blocking / Important / Medium / Minor
- **What doc says**: (quoted)
- **What code actually has**: (evidence with file:line)
- **Suggested fix**: (replacement text)
```

## Step 3: Consolidate Results

After ALL agents complete, consolidate into this report format:

```markdown
## Spec Drift Report — ccWidgets
Generated: {date}
Scanned: {N} ai-docs folders, {M} documents

### Summary

| ai-docs Folder | Findings | Blocking | Important | Medium | Minor |
|----------------|----------|----------|-----------|--------|-------|
| (each folder)  |          |          |           |        |       |
| framework      |          |          |           |        |       |
| **Total**      | **N**    |          |           |        |       |

### Blocking Findings
(must fix — wrong APIs that would cause runtime errors if AI agent follows the docs)

### Important Findings
(wrong params, signatures, types — would cause compilation errors)

### Medium Findings
(incomplete info, stale file trees — would cause confusion)

### Minor Findings
(broken links, cosmetic issues)

### Actionable Fixes by File
(grouped by file path, each with exact old text -> new text)
```

## Rules

- Do NOT auto-fix anything — report findings only
- Always read actual source code to verify — never assume
- Use the Task tool with `subagent_type: "Explore"` for all checker agents
- Run all agents in parallel for speed
- If an ai-docs folder has no corresponding source directory, flag it as a Category 1 (File Tree) finding
- Count findings by severity in the summary table
