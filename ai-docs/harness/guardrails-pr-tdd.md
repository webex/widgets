# Development Phase Guardrails — PR Size and TDD

Proposed automated checks for the Development phase harness. **Phase 1:** document and enforce via agent checklist. **Phase 2:** wire into CI/CodeRabbit (optional implementation).

---

## 1. PR Size Guardrail

### Policy

| Metric | Soft limit (warning) | Hard limit (block) |
|--------|----------------------|---------------------|
| Lines changed (add + delete) | 300 | 400 |
| Files changed | 12 | 15 |
| Packages touched | 2 | 3 |

**Exceptions:** mechanical refactors, dependency bumps, generated files — require human approval comment on PR.

### Agent Checklist (Phase 1 — Now)

Before `/dev-pr`, orchestrator runs:

```bash
cd {WORKTREE_PATH}
git diff --cached --stat
git diff --cached --numstat | awk '{added+=$1; deleted+=$2} END {print "lines:", added+deleted}'
git diff --cached --name-only | wc -l
```

If hard limit exceeded → split ticket or get human waiver in Jira before PR.

### Proposed CI Job (Phase 2)

Add to `.github/workflows/pull-request.yml` under `validated` label gate:

```yaml
pr_size_check:
  name: PR size guardrail
  runs-on: ubuntu-latest
  if: contains(github.event.pull_request.labels.*.name, 'validated')
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - name: Check PR size
      run: |
        FILES=$(git diff --name-only origin/next...HEAD | wc -l)
        LINES=$(git diff --numstat origin/next...HEAD | awk '{s+=$1+$2} END {print s+0}')
        if [ "$FILES" -gt 15 ] || [ "$LINES" -gt 400 ]; then
          echo "::error::PR exceeds size limits (files=$FILES, lines=$LINES). Split or request waiver."
          exit 1
        fi
```

### Proposed CodeRabbit Rule (Phase 2)

Add to `.coderabbit.yaml` under `reviews`:

```yaml
path_instructions:
  - path: "**/*"
    instructions: |
      Flag PRs with more than 400 total line changes or 15 files changed.
      Recommend splitting unless the PR is a dependency bump or mechanical refactor.
```

---

## 2. TDD-in-Diff Guardrail

### Policy

Every Development phase PR that changes production code (`packages/**/src/**`) MUST include at least one new or modified test file under:

- `packages/**/tests/**`, or
- `playwright/tests/**`, or
- `playwright/suites/**`

**Exceptions:** docs-only, pure config, or human-documented waiver in Jira.

### Agent Checklist (Phase 1 — Now)

Cross-Verification Agent verifies:

```bash
cd {WORKTREE_PATH}
# Production changes
git diff --cached --name-only | grep -E 'packages/.+/src/' || true
# Test changes
git diff --cached --name-only | grep -E '(tests/|playwright/)' || true
```

If production changed and no test files in diff → **blocker** in review JSON.

Implementation Agent workflow already requires failing test first ([dev-implementer.md](../../.claude/agents/dev-implementer.md)).

### Proposed CI Job (Phase 2)

```yaml
tdd_diff_check:
  name: TDD in diff
  runs-on: ubuntu-latest
  if: contains(github.event.pull_request.labels.*.name, 'validated')
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - name: Require tests when src changes
      run: |
        SRC=$(git diff --name-only origin/next...HEAD | grep -E 'packages/.+/src/' | wc -l)
        TESTS=$(git diff --name-only origin/next...HEAD | grep -E '(tests/|playwright/)' | wc -l)
        if [ "$SRC" -gt 0 ] && [ "$TESTS" -eq 0 ]; then
          echo "::error::Production code changed without test file changes."
          exit 1
        fi
```

---

## 3. Existing Guardrails (Already Implemented)

| Guardrail | Where |
|-----------|-------|
| PR title format | `.github/workflows/pull-request.yml` |
| Full unit + styles on commit | `.husky/pre-commit` |
| Spec drift advisory | `.claude/commands/spec-drift-changed.md` |
| CodeRabbit auto-review | `.coderabbit.yaml` |
| FedRAMP PR template | `.github/PULL_REQUEST_TEMPLATE.md` |
| TDD methodology | Agent prompts + `superpowers:test-driven-development` |

---

## 4. Integration with Development Phase

| Phase | Guardrail |
|-------|-----------|
| Phase 2 Implement | TDD — failing test first (agent) |
| Phase 4 PR | PR size + TDD-in-diff (agent checklist) |
| Phase 4 PR | Husky + CI on merge path |
| Post-merge | N/A |

Reference: [development-phase-plan.md](./development-phase-plan.md) Section 7.

---

_Last updated: 2026-06-10_
