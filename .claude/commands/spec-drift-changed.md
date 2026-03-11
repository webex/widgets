# Spec Drift Detection — Changed Files Only

Validate ai-docs affected by any staged/unstaged changes — whether the changes are to ai-docs themselves OR to source code that has corresponding ai-docs. Lightweight mode for pre-commit validation.

## Step 1: Find All Changed Files

Run these commands to find all changed files (staged and unstaged):

```bash
# Get both staged and unstaged changed files
(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null) | sort -u
```

## Step 2: Identify ai-docs That Need Validation

From the changed files, build TWO lists:

### List A: Changed ai-docs files
Filter for files matching `ai-docs/*.md`. These docs changed directly and need validation.

### List B: Source code files with corresponding ai-docs
For each changed source file under `packages/contact-center/` (excluding ai-docs files themselves):
1. Walk up the file's directory path
2. Check if any ancestor directory contains an `ai-docs/` folder
3. If yes, that `ai-docs/` folder needs validation against the updated source code

Use this to discover ai-docs folders:
```bash
find packages/contact-center -type d -name "ai-docs"
```

Build a mapping like:
```
Changed source file                                                → ai-docs to validate
packages/contact-center/store/src/store.ts                         → packages/contact-center/store/ai-docs/
packages/contact-center/task/src/widgets/CallControl/CallControl.tsx → packages/contact-center/task/ai-docs/widgets/CallControl/
packages/contact-center/cc-components/src/SomeComponent.tsx        → packages/contact-center/cc-components/ai-docs/
```

For task widget source files, map to the widget-specific ai-docs:
- `packages/contact-center/task/src/widgets/CallControl/*` → `packages/contact-center/task/ai-docs/widgets/CallControl/`
- `packages/contact-center/task/src/widgets/IncomingTask/*` → `packages/contact-center/task/ai-docs/widgets/IncomingTask/`
- `packages/contact-center/task/src/widgets/OutdialCall/*` → `packages/contact-center/task/ai-docs/widgets/OutdialCall/`
- `packages/contact-center/task/src/widgets/TaskList/*` → `packages/contact-center/task/ai-docs/widgets/TaskList/`

**Deduplicate**: If multiple source files map to the same ai-docs folder, validate that folder only once.

### Combine Lists A and B
The final set of ai-docs folders to validate is the union of:
- Folders containing files from List A
- Folders identified from List B

If NEITHER list has entries, report: **"No ai-docs affected by current changes — nothing to check."** and stop.

## Step 3: Validate Affected ai-docs

For each ai-docs folder that needs validation, spawn an Explore agent with this prompt:

```
You are validating SDD documentation accuracy against source code.

SOURCE OF TRUTH (actual code): {source_code_directory}
DOCS TO VALIDATE: {ai_docs_folder} (all .md files in this folder)

CHANGED SOURCE FILES (if any): {list of changed source files in this package}
CHANGED DOC FILES (if any): {list of changed ai-docs files}

Read every markdown file in the ai-docs folder. For each document, check these 7 categories:

1. FILE TREE: Read any documented file/directory trees. Glob the actual directory. Report missing/extra files.

2. METHOD/API SIGNATURES: For every method documented, read the actual source and verify: name, params, param types, return type, modifiers. Flag any mismatch. Pay special attention to methods in changed source files — new methods may be missing from docs, or changed signatures may not be reflected.

3. TYPE DEFINITIONS: For every type/enum/interface documented, find the actual definition in source. Compare name, fields, field types, enum values. Check if changed source files introduced new types not yet documented.

4. EVENT NAMES: For every event constant or observable referenced, verify it exists in source with the exact name. For MobX: verify @observable/@computed/@action decorators. For React: verify prop callback names. Check if changed source files added new events not yet documented.

5. ARCHITECTURE PATTERNS: Verify claims about MobX store patterns, React component patterns, singleton vs factory, component hierarchy, store injection.

6. LINK VALIDATION: For every relative link [text](path), verify the target exists on disk.

7. CODE EXAMPLES: For every code block, verify API names, method names, parameter names, import paths, MobX patterns are correct.

For each finding, report:
- File: (path)
- Line/Section: (approximate line or section heading)
- Category: (1-7)
- Severity: Blocking / Important / Medium / Minor
  - Blocking = wrong API that would cause runtime errors if an AI agent follows the docs
  - Important = wrong params/types that would cause compilation errors
  - Medium = incomplete or stale info (e.g., new methods/types/events missing from docs)
  - Minor = broken links, cosmetic issues
- What doc says: (quoted)
- What code actually has: (evidence with file:line)
- Suggested fix: (exact replacement text)
```

Run all agents in parallel if multiple ai-docs folders are affected.

## Step 4: Consolidate and Report

Present findings in this format:

```markdown
## Spec Drift Report — Changed Files
Generated: {date}
Trigger: {source code changes / ai-docs changes / both}
ai-docs folders checked: {list}

### Changed Source Files
{list of changed source files and their mapped ai-docs folder}

### Changed ai-docs Files
{list of changed ai-docs files, or "None"}

### Summary

| ai-docs Folder | Findings | Blocking | Important | Medium | Minor |
|----------------|----------|----------|-----------|--------|-------|
| ...            |          |          |           |        |       |

### Blocking Findings
...

### Important Findings
...

### Medium Findings
...

### Minor Findings
...

### Actionable Fixes by File
(grouped by file path, each with exact old text -> new text)
```

## Step 5: Create Verification Marker

After presenting the validation report (regardless of findings), create a verification marker so the pre-commit hook allows the commit:

```bash
# Hash ALL staged contact-center files — must match the hook's hash logic exactly
STAGED_CC=$(git diff --cached --name-only 2>/dev/null | grep "^packages/contact-center/" | sort)
if [ -n "$STAGED_CC" ]; then
  HASH=$(echo "$STAGED_CC" | shasum | cut -d' ' -f1)
  touch "/tmp/.spec-drift-verified-${HASH}"
  echo "Verification marker created: /tmp/.spec-drift-verified-${HASH}"
fi
```

Report to the user: "Verification marker created. The pre-commit hook will allow the next commit for these staged files."

## Rules

- Do NOT auto-fix anything — report findings only
- Always read actual source code to verify — never assume
- Use the Task tool with `subagent_type: "Explore"` for checker agents
- Run agents in parallel when multiple folders are affected
- Always create the verification marker at the end, even if there are findings (the developer decides whether to fix or commit as-is)
- The marker hash MUST match the hook's hash computation — both hash ALL staged `packages/contact-center/` files sorted alphabetically
