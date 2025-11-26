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
3. ✅ Document station-login and user-state (agent.md, architecture.md in ai-prompts/)
4. ✅ Convert all diagrams to Mermaid format for better compatibility
5. ⏳ Create templates (widget scaffolding, prompt/checklist guidance)
6. ⏳ Validate with Cursor and Windsurf prompts to ensure AI consistency
7. ⏳ Refine documents based on pilot learnings and developer feedback

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
    "agents.md": "AI navigation guide (task-based workflows, references to widget agent.md files)",
    "ai-docs/README.md": "Repository information (technologies, components, architecture)"
  },
  "ai-docs": {
    "patterns": ["typescript-patterns.md", "mobx-patterns.md", "react-patterns.md", "web-component-patterns.md", "testing-patterns.md"],
    "diagrams": ["llm-navigation.puml", "architecture.puml"]
  },
  "components": {
    "ai-prompts": {
      "structure": ["agent.md", "architecture.md"],
      "purpose": "Component-specific documentation co-located with code",
      "agent.md": "Overview, why/what, examples/use cases, dependencies",
      "architecture.md": "Component overview table (config/props/state/callbacks/events/tests), data flows, sequence diagrams (PlantUML), troubleshooting guide"
    }
  }
}
```

**Current Structure:**

```
/
├── agents.md                          # AI assistant navigation guide (references widget-level agent.md files)
├── ai-docs/
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
    │   ├── agent.md                   # Overview, use cases, examples, dependencies
    │   └── architecture.md            # Component table, data flows, diagrams, troubleshooting
    ├── user-state/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    ├── store/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    ├── cc-components/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    ├── cc-widgets/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    ├── ui-logging/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    ├── test-fixtures/ai-prompts/
    │   ├── agent.md
    │   └── architecture.md
    └── task/ai-prompts/
        ├── agent.md
        └── architecture.md
```

---

## Detailed Task Breakdown

### Phase 0.1-0.5: Foundation Patterns (✅ COMPLETED)

| Phase | Component | Task Description | File Created | Learning Focus | Status |
|-------|-----------|------------------|--------------|----------------|--------|
| 0.1 | Patterns | Create TypeScript patterns doc | `docs/patterns/typescript-patterns.md` | TypeScript strict conventions, naming, imports | ✅ Done |
| 0.2 | Patterns | Create MobX patterns doc | `docs/patterns/mobx-patterns.md` | MobX observables, actions, store patterns | ✅ Done |
| 0.3 | Patterns | Create React patterns doc | `docs/patterns/react-patterns.md` | Hooks, composition, error boundaries | ✅ Done |
| 0.4 | Patterns | Create Web Component patterns doc | `docs/patterns/web-component-patterns.md` | r2wc, custom elements, prop mapping | ✅ Done |
| 0.5 | Patterns | Create Testing patterns doc | `docs/patterns/testing-patterns.md` | Jest, Playwright, mocking strategies | ✅ Done |

### Phase 0.6-0.8: Master Documentation (✅ COMPLETED)

| Phase | Component | Task Description | File Created | Learning Focus | Status |
|-------|-----------|------------------|--------------|----------------|--------|
| 0.6 | Diagrams | Create LLM navigation diagram | `docs/diagrams/llm-navigation.puml` | How AIs should navigate docs | ✅ Done |
| 0.7 | Diagrams | Create architecture diagram | `docs/diagrams/architecture.puml` | Monorepo structure, dependencies | ✅ Done |
| 0.8 | Entry Points | Create master README + agents.md | `docs/README.md` + `/agents.md` | Repo info + AI navigation | ✅ Done |

### Phase 0.9-0.12: Component Documentation (✅ COMPLETED)

**Station Login Component:**

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 0.9 | Station Login | Create agent.md | `packages/.../station-login/ai-prompts/agent.md` | Widget overview, use cases, examples, dependencies | ✅ Done |
| 0.10 | Station Login | Create architecture.md | `packages/.../station-login/ai-prompts/architecture.md` | Component table, data flows, sequence diagrams, troubleshooting | ✅ Done |

**User State Component:**

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 0.11 | User State | Create agent.md | `packages/.../user-state/ai-prompts/agent.md` | Widget overview, use cases, examples, dependencies | ✅ Done |
| 0.12 | User State | Create architecture.md | `packages/.../user-state/ai-prompts/architecture.md` | Component table, data flows, timer logic, troubleshooting | ✅ Done |

**Store Documentation:**

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 0.13 | Store | Create agent.md | `packages/.../store/ai-prompts/agent.md` | Store API, singleton pattern, usage examples | 🔲 Not Started |
| 0.14 | Store | Create architecture.md | `packages/.../store/ai-prompts/architecture.md` | Store architecture, wrapper, events, data flows | 🔲 Not Started |

### Phase 0.15-0.23: Additional Documentation (⏳ PLANNED)

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 0.15 | cc-components | Create agent.md | `packages/.../cc-components/ai-prompts/agent.md` | Component library overview, usage | ⏳ Planned |
| 0.16 | cc-components | Create architecture.md | `packages/.../cc-components/ai-prompts/architecture.md` | React component patterns, structure | ⏳ Planned |
| 0.17 | cc-widgets | Create agent.md | `packages/.../cc-widgets/ai-prompts/agent.md` | Widget exports, aggregation overview | ⏳ Planned |
| 0.18 | cc-widgets | Create architecture.md | `packages/.../cc-widgets/ai-prompts/architecture.md` | Web Component aggregation patterns | ⏳ Planned |
| 0.19 | ui-logging | Create agent.md | `packages/.../ui-logging/ai-prompts/agent.md` | Logging utilities overview, usage | ⏳ Planned |
| 0.20 | ui-logging | Create architecture.md | `packages/.../ui-logging/ai-prompts/architecture.md` | Metrics/logging patterns, flows | ⏳ Planned |
| 0.21 | test-fixtures | Create agent.md | `packages/.../test-fixtures/ai-prompts/agent.md` | Test fixtures overview, usage | ⏳ Planned |
| 0.22 | test-fixtures | Create architecture.md | `packages/.../test-fixtures/ai-prompts/architecture.md` | Fixture patterns, structure | ⏳ Planned |
| 0.23 | Templates | Create widget template | `WIDGET_TEMPLATE/` + configs | Template scaffolding | ⏳ Planned |

### Phase 0.24-0.27: IDE Integration (⏳ PLANNED)

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 0.24 | AI Rules | Draft `.cursorrules` | `.cursorrules` | Cursor-specific references | ⏳ Planned |
| 0.25 | AI Rules | Draft `.windsurfrules` | `.windsurfrules` | Windsurf references | ⏳ Planned |
| 0.26 | Prompts | Document prompt templates | `PROMPTS.md` | Bug/enhancement/new widget prompts | ⏳ Planned |
| 0.27 | Checklists | Document pre/post change checks | `CHECKLIST.md` | Validation workflows | ⏳ Planned |

### Phase 0.28-0.33: Validation & Refinement (⏳ PLANNED)

| Phase | Component | Task Description | File/Context | Learning Focus | Status |
|-------|-----------|------------------|--------------|----------------|--------|
| 0.28 | Validation | Cursor prompt (bug fix) | — | AI query hygiene | ⏳ Planned |
| 0.29 | Validation | Cursor prompt (enhancement) | — | Prompt clarity | ⏳ Planned |
| 0.30 | Validation | Windsurf prompt (bug fix) | — | Cross-IDE consistency | ⏳ Planned |
| 0.31 | Validation | Windsurf prompt (enhancement) | — | Pattern enforcement | ⏳ Planned |
| 0.32 | Refinement | Update docs based on validation | Various pilot files | Continuous improvement | ⏳ Planned |
| 0.33 | Review | Team review & sign-off | All pilot artifacts | Collaboration & feedback cycle | ⏳ Planned |

### Phase 1: Scaling — Task Package + Widgets (⏳ FUTURE)

| Phase | Component | Task Description | File to Create | Learning Focus | Status |
|-------|-----------|------------------|----------------|----------------|--------|
| 1.1 | Task Package | Create agent.md | `task/ai-prompts/agent.md` | Task package overview, aggregator patterns | ⏳ Future |
| 1.2 | Task Package | Create architecture.md | `task/ai-prompts/architecture.md` | Package structure, widget relationships | ⏳ Future |
| 1.3 | IncomingTask | Create agent.md | `task/IncomingTask/ai-prompts/agent.md` | Task intake widget overview | ⏳ Future |
| 1.4 | IncomingTask | Create architecture.md | `task/IncomingTask/ai-prompts/architecture.md` | Task intake flows, sequence diagrams | ⏳ Future |
| 1.5 | TaskList | Create agent.md | `task/TaskList/ai-prompts/agent.md` | Task management widget overview | ⏳ Future |
| 1.6 | TaskList | Create architecture.md | `task/TaskList/ai-prompts/architecture.md` | Task management flows, diagrams | ⏳ Future |
| 1.7 | CallControl | Create agent.md | `task/CallControl/ai-prompts/agent.md` | Call handling widget overview | ⏳ Future |
| 1.8 | CallControl | Create architecture.md | `task/CallControl/ai-prompts/architecture.md` | Call handling flows, diagrams | ⏳ Future |
| 1.9 | CallControlCAD | Create agent.md | `task/CallControlCAD/ai-prompts/agent.md` | CAD-enabled widget overview | ⏳ Future |
| 1.10 | CallControlCAD | Create architecture.md | `task/CallControlCAD/ai-prompts/architecture.md` | CAD flows, diagrams | ⏳ Future |
| 1.11 | OutdialCall | Create agent.md | `task/OutdialCall/ai-prompts/agent.md` | Outbound call widget overview | ⏳ Future |
| 1.12 | OutdialCall | Create architecture.md | `task/OutdialCall/ai-prompts/architecture.md` | Outbound call flows, diagrams | ⏳ Future |
| 1.13 | Validation | Spot-check with AI tool | — | Lightweight regression validation | ⏳ Future |
| 1.14 | Review | Final review & updates | Various task files | Quality & completeness | ⏳ Future |

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
- ✅ Component ai-prompts/ documentation (station-login, user-state) - Using Mermaid diagrams
- 🔄 Store documentation (agent.md, architecture.md)
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


---

_Last Updated: 2025-11-23_
