# Initial Prompts for Using AI Docs

Use one of the prompts below as your first message to an LLM. Each prompt instructs the model to start at `AGENTS.md`, choose the correct template in `ai-docs/templates`, gather clarifying inputs, and only then inspect code.

## 1) Create a New Widget
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: create a new widget named <WidgetName> for <purpose>.

Start by asking clarifying questions and collecting mandatory design input (Figma link, screenshot, or detailed design spec). Then route to `ai-docs/templates/new-widget/00-master.md` and follow all modules in order. Only open code after you have all required design/architecture context and have read the relevant `ai-docs/AGENTS.md` and `ai-docs/ARCHITECTURE.md` for the target package. Summarize your planned steps before editing files.
```

## 2) Add a Feature to an Existing Widget
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: add a feature to the existing widget <WidgetName>. The feature is: <feature description>.

Ask any clarifying questions needed to scope the change (inputs, outputs, UX, edge cases). Then route to `ai-docs/templates/existing-widget/feature-enhancement.md` and follow it. Read `packages/contact-center/<widget-name>/ai-docs/AGENTS.md` and `packages/contact-center/<widget-name>/ai-docs/ARCHITECTURE.md` before opening code. Only inspect code once you have full context and requirements.
```

## 3) Fix a Bug in an Existing Widget
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: fix a bug in <WidgetName>. Bug description: <what breaks, where, and when>. Expected behavior: <expected>.

Ask clarifying questions if needed (repro steps, logs, environment). Then route to `ai-docs/templates/existing-widget/bug-fix.md` and follow the workflow, including root cause analysis. Read the widget’s `ai-docs/AGENTS.md` and `ai-docs/ARCHITECTURE.md` before inspecting code. Only open code after you have a clear hypothesis and plan.
```

## 4) Migrate or Refactor (Tech Debt, API Changes, Package Moves)
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: perform a migration/refactor in <scope>, such as <API update / package move / dependency change>.

Ask clarifying questions about the scope, impacted packages, and constraints. Then identify the relevant package `ai-docs/AGENTS.md` and `ai-docs/ARCHITECTURE.md` and read them before touching code. Use the appropriate template in `ai-docs/templates` if one fits; if not, propose a structured plan and confirm it with me first. Only inspect code after the plan and documentation review are complete.
```

## 5) UI/UX Change to an Existing Widget
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: update the UI/UX of <WidgetName> with these changes: <description>.

Ask for design input if it is not already provided (Figma, screenshot, or detailed spec). Then read the widget’s `ai-docs/AGENTS.md` and `ai-docs/ARCHITECTURE.md`. Follow any relevant template under `ai-docs/templates`. Only inspect code after you understand the design and architecture constraints.
```

## 6) Documentation-Only Updates
```text
You are an AI assistant working in this repo. Follow `AGENTS.md` as the top-level router. My task: update documentation for <package or widget> (AGENTS.md and/or ARCHITECTURE.md).

Route to `ai-docs/templates/documentation/create-agent-md.md` and `ai-docs/templates/documentation/create-architecture-md.md`. Read the target package’s existing ai-docs before proposing edits. Only inspect code if required to verify behavior or examples.
```
