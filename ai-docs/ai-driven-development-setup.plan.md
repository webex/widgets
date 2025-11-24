# AI-Driven Development Documentation Setup

## Overview

This plan establishes comprehensive AI guidance documentation for the contact center widgets monorepo. The goal is to enable consistent, hallucination-free development across Cursor, Windsurf, and other AI-based IDEs through distributed documentation and pattern-based guidance.

**Target Audience**

- **Developers new to the web stack** — learning TypeScript, React, MobX, testing, and build tooling while contributing to this repo
- **Experienced web developers** — ensuring consistent patterns while leveraging AI assistance

**Approach**

- **Pilot-first**: Validate all instructions, templates, and prompts using the **station-login** and **user-state** widgets before scaling to the rest of the widget set
- **Incremental widget coverage**: After the pilot, apply the proven templates to `task` widgets and any remaining packages
- **Distributed documentation**: Component-specific docs co-located with code in `ai-prompts/` folders

---

## Repository Context

**Monorepo structure**: Yarn workspaces with the following primary contact-center packages

- `store` (MobX state management)
- `cc-components` (React UI primitives)
- `cc-widgets` (widget aggregators and WC exports)
- Widget packages: `station-login`, `user-state`, `task` (with IncomingTask, TaskList, CallControl, CallControlCAD, OutdialCall), `ui-logging`, and `test-fixtures`

**Key technologies**: TypeScript, React (functional + hooks), MobX, Web Components (r2wc), Jest, Playwright, Webpack, Babel

---

## Implementation Strategy

### Pilot Phase: Station Login & User State

1. ✅ Analyze existing patterns to capture expectations for TypeScript, MobX, React, Web Components, and tests
2. ✅ Produce foundation documentation (repo-wide patterns, diagrams, navigation guides)
3. 🔄 Document station-login and user-state (README, OVERVIEW, EXAMPLES, RULES in ai-prompts/)
4. ⏳ Create templates (widget scaffolding, prompt/checklist guidance)
5. ⏳ Validate with Cursor and Windsurf prompts to ensure AI consistency
6. ⏳ Refine documents based on pilot learnings and developer feedback

### Scaling Phase: Task Widgets and Remaining Packages

1. Apply refined templates to the `task` package overview plus each task sub-widget
2. Spot-check AI validation (lightweight prompts) to maintain quality
3. Continue iterating templates whenever new patterns surface

---

## Learning Opportunities

As the documentation is created, developers will reinforce or gain:

- TypeScript definitions, strict mode reasoning, and module patterns
- React functional components, hooks, error boundaries, and component composition
- MobX observables, computed actions, observer usage, and store integration
- Web Component wrappers (r2wc, custom elements, postMessage patterns)
- Testing with Jest, React Testing Library, and Playwright
- Build tooling with Webpack, Babel, and tsconfig orchestration
- Documentation craftsmanship (structure, examples, prompts)

---

## Key Benefits

- **Prevent hallucinations**: Step-by-step constraints and examples guide every AI response
- **Ensure consistency**: Same instructions apply across Cursor, Windsurf, GitHub Copilot, etc.
- **Accelerate onboarding**: Developers (new and experienced) quickly see how widgets fit together
- **Maintain quality**: Checks, prompts, and docs enforce testing and review standards
- **Preserve institutional knowledge**: Pattern-based docs keep tribal knowledge alive

---

## Documentation Structure

**Distributed Documentation Approach:**

```json
{
  "root": {
    "agents.md": "AI navigation guide (task-based workflows, best practices)",
    "docs/README.md": "Repository information (technologies, components, architecture)"
  },
  "docs": {
    "patterns": ["typescript-patterns.md", "mobx-patterns.md", "react-patterns.md", "web-component-patterns.md", "testing-patterns.md"],
    "diagrams": ["llm-navigation.puml", "architecture.puml"]
  },
  "components": {
    "ai-prompts": {
      "structure": ["README.md", "OVERVIEW.md", "EXAMPLES.md", "RULES.md", "diagrams/"],
      "purpose": "Component-specific documentation co-located with code"
    }
  }
}
```

**Current Structure:**

```
/
├── agents.md                          # AI assistant navigation guide
├── docs/
│   ├── README.md                      # Repository information
│   ├── ai-driven-development-setup.plan.md  # This file
│   ├── patterns/                      # Repo-wide patterns
│   │   ├── typescript-patterns.md
│   │   ├── mobx-patterns.md
│   │   ├── react-patterns.md
│   │   ├── web-component-patterns.md
│   │   └── testing-patterns.md
│   └── diagrams/                      # Architecture visuals
│       ├── llm-navigation.puml
│       └── architecture.puml
│
└── packages/contact-center/
    ├── station-login/ai-prompts/      # Component docs
    │   └── diagrams/station-login.puml
    ├── user-state/ai-prompts/
    │   └── diagrams/user-state.puml
    └── store/ai-prompts/
```

---

## Detailed Task Breakdown

### Phase 0.1-0.5: Foundation Patterns (✅ COMPLETED)

| Phase | Component | Task Description | File Created | Learning Focus | Owner | Status |
|-------|-----------|------------------|--------------|----------------|-------|--------|
| 0.1 | Patterns | Create TypeScript patterns doc | `docs/patterns/typescript-patterns.md` | TypeScript strict conventions, naming, imports | Documentation Team | ✅ Done |
| 0.2 | Patterns | Create MobX patterns doc | `docs/patterns/mobx-patterns.md` | MobX observables, actions, store patterns | Documentation Team | ✅ Done |
| 0.3 | Patterns | Create React patterns doc | `docs/patterns/react-patterns.md` | Hooks, composition, error boundaries | Documentation Team | ✅ Done |
| 0.4 | Patterns | Create Web Component patterns doc | `docs/patterns/web-component-patterns.md` | r2wc, custom elements, prop mapping | Documentation Team | ✅ Done |
| 0.5 | Patterns | Create Testing patterns doc | `docs/patterns/testing-patterns.md` | Jest, Playwright, mocking strategies | Documentation Team | ✅ Done |

### Phase 0.6-0.8: Master Documentation (✅ COMPLETED)

| Phase | Component | Task Description | File Created | Learning Focus | Owner | Status |
|-------|-----------|------------------|--------------|----------------|-------|--------|
| 0.6 | Diagrams | Create LLM navigation diagram | `docs/diagrams/llm-navigation.puml` | How AIs should navigate docs | Documentation Team | ✅ Done |
| 0.7 | Diagrams | Create architecture diagram | `docs/diagrams/architecture.puml` | Monorepo structure, dependencies | Documentation Team | ✅ Done |
| 0.8 | Entry Points | Create master README + agents.md | `docs/README.md` + `/agents.md` | Repo info + AI navigation | Documentation Team | ✅ Done |

### Phase 0.9-0.11: Component Documentation (🔄 IN PROGRESS)

**Station Login Component:**

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 0.9 | Station Login | Create README | `packages/.../station-login/ai-prompts/README.md` | Widget API, props, usage | Documentation Team | 🔲 Not Started |
| 0.10 | Station Login | Create OVERVIEW | `packages/.../station-login/ai-prompts/OVERVIEW.md` | Internal architecture, hooks, flow | Documentation Team | 🔲 Not Started |
| 0.11 | Station Login | Create EXAMPLES | `packages/.../station-login/ai-prompts/EXAMPLES.md` | Common patterns, code examples | Documentation Team | 🔲 Not Started |
| 0.12 | Station Login | Create RULES | `packages/.../station-login/ai-prompts/RULES.md` | Component conventions, constraints | Documentation Team | 🔲 Not Started |

**User State Component:**

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 0.13 | User State | Create README | `packages/.../user-state/ai-prompts/README.md` | Widget API, props, usage | Documentation Team | 🔲 Not Started |
| 0.14 | User State | Create OVERVIEW | `packages/.../user-state/ai-prompts/OVERVIEW.md` | Internal architecture, timer, flow | Documentation Team | 🔲 Not Started |
| 0.15 | User State | Create EXAMPLES | `packages/.../user-state/ai-prompts/EXAMPLES.md` | Common patterns, code examples | Documentation Team | 🔲 Not Started |
| 0.16 | User State | Create RULES | `packages/.../user-state/ai-prompts/RULES.md` | Component conventions, constraints | Documentation Team | 🔲 Not Started |

**Store Documentation:**

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 0.17 | Store | Create README | `packages/.../store/ai-prompts/README.md` | Store API, singleton pattern | Documentation Team | 🔲 Not Started |
| 0.18 | Store | Create OVERVIEW | `packages/.../store/ai-prompts/OVERVIEW.md` | Store architecture, wrapper, events | Documentation Team | 🔲 Not Started |

### Phase 0.19-0.23: Additional Documentation (⏳ PLANNED)

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 0.19 | cc-components | Document component library | `packages/.../cc-components/ai-prompts/` | React component patterns | Documentation Team | ⏳ Planned |
| 0.20 | cc-widgets | Document widget exports | `packages/.../cc-widgets/ai-prompts/` | Web Component aggregation | Documentation Team | ⏳ Planned |
| 0.21 | ui-logging | Document logging utilities | `packages/.../ui-logging/ai-prompts/` | Metrics/logging helper usage | Documentation Team | ⏳ Planned |
| 0.22 | test-fixtures | Document test fixtures | `packages/.../test-fixtures/ai-prompts/` | Fixture utilization | Documentation Team | ⏳ Planned |
| 0.23 | Templates | Create widget template | `WIDGET_TEMPLATE/` + configs | Template scaffolding | Documentation Team | ⏳ Planned |

### Phase 0.24-0.27: IDE Integration (⏳ PLANNED)

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 0.24 | AI Rules | Draft `.cursorrules` | `.cursorrules` | Cursor-specific references | Documentation Team | ⏳ Planned |
| 0.25 | AI Rules | Draft `.windsurfrules` | `.windsurfrules` | Windsurf references | Documentation Team | ⏳ Planned |
| 0.26 | Prompts | Document prompt templates | `PROMPTS.md` | Bug/enhancement/new widget prompts | Documentation Team | ⏳ Planned |
| 0.27 | Checklists | Document pre/post change checks | `CHECKLIST.md` | Validation workflows | Documentation Team | ⏳ Planned |

### Phase 0.28-0.33: Validation & Refinement (⏳ PLANNED)

| Phase | Component | Task Description | File/Context | Learning Focus | Owner | Status |
|-------|-----------|------------------|--------------|----------------|-------|--------|
| 0.28 | Validation | Cursor prompt (bug fix) | — | AI query hygiene | Documentation Team | ⏳ Planned |
| 0.29 | Validation | Cursor prompt (enhancement) | — | Prompt clarity | Documentation Team | ⏳ Planned |
| 0.30 | Validation | Windsurf prompt (bug fix) | — | Cross-IDE consistency | Documentation Team | ⏳ Planned |
| 0.31 | Validation | Windsurf prompt (enhancement) | — | Pattern enforcement | Documentation Team | ⏳ Planned |
| 0.32 | Refinement | Update docs based on validation | Various pilot files | Continuous improvement | Documentation Team | ⏳ Planned |
| 0.33 | Review | Team review & sign-off | All pilot artifacts | Collaboration & feedback cycle | Documentation Team | ⏳ Planned |

### Phase 1: Scaling — Task Package + Widgets (⏳ FUTURE)

| Phase | Component | Task Description | File to Create | Learning Focus | Owner | Status |
|-------|-----------|------------------|----------------|----------------|-------|--------|
| 1.1 | Task Package | Document package | `task/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | Aggregator patterns | Documentation Team | ⏳ Future |
| 1.2 | IncomingTask | Document widget | `task/IncomingTask/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | Task intake design | Documentation Team | ⏳ Future |
| 1.3 | TaskList | Document widget | `task/TaskList/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | Task management flows | Documentation Team | ⏳ Future |
| 1.4 | CallControl | Document widget | `task/CallControl/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | Call handling patterns | Documentation Team | ⏳ Future |
| 1.5 | CallControlCAD | Document widget | `task/CallControlCAD/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | CAD-enabled flows | Documentation Team | ⏳ Future |
| 1.6 | OutdialCall | Document widget | `task/OutdialCall/ai-prompts/{README,OVERVIEW,EXAMPLES,RULES}` | Outbound call flows | Documentation Team | ⏳ Future |
| 1.7 | Validation | Spot-check with AI tool | — | Lightweight regression validation | Documentation Team | ⏳ Future |
| 1.8 | Review | Final review & updates | Various task files | Quality & completeness | Documentation Team | ⏳ Future |

---

## Key Design Decisions

### Distributed Documentation
- **Decision:** Component docs live with code in `ai-prompts/` folders
- **Rationale:** Co-location improves discoverability and maintenance
- **Impact:** Easier for AI assistants to find relevant context

### Technology-Based Versioning
- **Decision:** Reference package.json files instead of hardcoding versions
- **Rationale:** Single source of truth, no version drift in docs
- **Example:** `Technology: TypeScript` with link to [tsconfig.json](../../tsconfig.json)

### IDE-Agnostic Patterns
- **Decision:** Patterns in `docs/patterns/` work with any LLM/IDE
- **Rationale:** Avoid lock-in to specific tools
- **Impact:** Cursor, Windsurf, Copilot, ChatGPT can all use same docs

### Pilot-First Approach
- **Decision:** Focus on station-login and user-state first
- **Rationale:** Validate approach before scaling to 5+ task widgets
- **Impact:** Can iterate quickly and refine templates

### Naming Conventions
- **Decision:** Added explicit naming/import conventions to pattern files
- **Rationale:** Reduce AI hallucinations on file names and imports
- **Location:** `docs/patterns/typescript-patterns.md`

---

## Success Criteria

**Pilot Phase (Current):**
- ✅ Pattern documentation created (TypeScript, MobX, React, WC, Testing)
- ✅ Master navigation created (agents.md + docs/README.md)
- ✅ Architecture diagrams created
- 🔄 Component ai-prompts/ documentation (station-login, user-state, store)
- ⏳ IDE integration files (.cursorrules, .windsurfrules)
- ⏳ Validation with actual AI coding tasks

**Scaling Phase (Future):**
- Templates proven effective during pilot
- Task package and widgets documented using refined templates
- AI tooling across IDEs follows documented guidance without hallucinating

---

## Current Progress Summary

**✅ Completed:**
- Foundation patterns (5 files)
- Master documentation (README, agents.md, diagrams)
- Directory restructure (docs/patterns/, ai-prompts/ folders)
- Naming and import conventions added
- Technology-based versioning implemented

**🔄 In Progress:**
- Component-specific ai-prompts/ documentation

**⏳ Next Steps:**
1. Document station-login component (README, OVERVIEW, EXAMPLES, RULES)
2. Document user-state component (README, OVERVIEW, EXAMPLES, RULES)
3. Document store (README, OVERVIEW)
4. Create .cursorrules and .windsurfrules
5. Validate with AI coding tasks
6. Refine based on feedback

---

_Last Updated: 2025-11-23_
