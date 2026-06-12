# Development Phase — PR and Review

## Purpose

Cross-agent review, guardrails, draft PR creation, human approval.

---

## Step 1: Cross-Verification

Spawn Cross-Verification Agent with:

- `git diff --cached` (or branch diff vs `next`)
- `spec.md`, `plan.md`
- Scope ai-docs and patterns

Review JSON must include `blockers[]`. Zero blockers required unless human overrides.

Checks:

- [ ] Implements all acceptance criteria in `spec.md`
- [ ] Follows architecture patterns
- [ ] TDD-in-diff: test files present when `src/` changed ([guardrails-pr-tdd.md](../../harness/guardrails-pr-tdd.md))
- [ ] No security red flags (PII logging, direct SDK import)
- [ ] ai-docs consistent with code

Invoke `superpowers:requesting-code-review`.

---

## Step 2: PR Size Check

Run guardrail checklist from [guardrails-pr-tdd.md](../../harness/guardrails-pr-tdd.md).

If over hard limit → split ticket or Jira waiver before PR.

---

## Step 3: Optional QA Coverage

For new features, optionally spawn `qa-test-coverage` agent — advisory only.

---

## Step 4: Create Draft PR

Git PR Agent (or `/dev-pr` in main conversation):

- Commit format: `{type}({scope}): {description}`
- Base branch: `next`
- Template: `.github/PULL_REQUEST_TEMPLATE.md` (FedRAMP/GAI sections)
- Default: **draft** PR

Apply Jira label `dev-pr-open`. Post PR JSON comment.

---

## Step 5: Human Review (Mandatory)

Human must:

- Review PR diff and test evidence
- Approve merge (or request changes)

**Mandatory human checkpoints:**

- Breaking API changes
- Security-sensitive changes
- Guardrail waivers

---

## Step 6: Merge

On merge:

- Jira label: `dev-merged`
- Proceed to [05-post-merge.md](./05-post-merge.md)

Invoke `superpowers:finishing-a-development-branch`.

---

## CI Labels

| Label | Effect |
|-------|--------|
| `validated` | Triggers title check, build, lint, unit tests |
| `run_e2e` | Triggers Playwright CI jobs |
