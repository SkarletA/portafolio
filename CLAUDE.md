# CLAUDE.md

## Project Overview

This repository contains a personal professional portfolio for:

**Product Tech Lead | Senior Frontend Developer**

The repository also contains **Finora**, a real personal finance application presented as one of the portfolio's featured products.

The portfolio and Finora live in the same repository but are treated as two different application boundaries.

### Public structure

```text
/
├── Portfolio
│
└── /finora
    └── Finora application
```

The portfolio is the main website.

Finora is an independent application accessible through:

```text
/finora
```

Finora must not be implemented as a portfolio section or hash route such as:

```text
#finora
```

---

# Core Principles

## 1. Respect the existing architecture

Before changing code:

1. Inspect the existing project structure.
2. Inspect relevant existing files.
3. Read `architect.md` when making architectural decisions.
4. Reuse existing patterns when appropriate.
5. Do not refactor unrelated parts of the portfolio.

Do not assume the project structure from this document is more accurate than the actual repository.

The repository is the source of truth.

---

## 2. Portfolio and Finora are separate boundaries

The portfolio remains a relatively simple presentation-oriented application.

Finora is a product/application with its own internal architecture.

Expected separation:

```text
src/
├── components/
├── sections/
├── pages/
├── data/
├── projects/
│   └── finora/
│       └── meta.js
│
└── apps/
    └── finora/
```

### Portfolio

Portfolio-related code belongs to the existing portfolio structure.

Examples:

```text
src/components/
src/sections/
src/pages/
src/data/
src/projects/
```

Do not move portfolio code into the Finora architecture.

### Finora

Finora-specific application code belongs under:

```text
src/apps/finora/
```

The portfolio metadata:

```text
src/projects/finora/meta.js
```

is presentation/case-study metadata only.

It must not become the location for Finora application logic.

---

# Routing

Finora must have a real application route:

```text
/finora
```

Use React Router when routing is required.

Expected high-level structure:

```text
BrowserRouter
├── portfolio routes
│   └── App
│
└── /finora/*
    └── FinoraApp
```

Finora must be independently routable.

Finora's internal routes should be defined within its application boundary rather than mixing them with portfolio components.

Prefer:

```jsx
<Link to="/finora">
```

for internal navigation.

Do not use:

```jsx
<a href="/finora">
```

for navigation between routes handled by React Router.

---

# Finora Architecture

Finora should be treated as a real product.

Its architecture should support:

* scalability
* maintainability
* testability
* accessibility
* responsive design
* reusable UI
* domain-driven financial logic
* clear technical decisions

However:

**Do not build abstractions before they are needed.**

Create folders, components, utilities, services, hooks, state management, or domain modules only when an actual feature justifies them.

Avoid speculative architecture.

---

# Finora Initial Structure

The initial Finora structure should remain intentionally small.

A valid starting point is:

```text
src/
└── apps/
    └── finora/
        ├── FinoraApp.jsx
        ├── routes.jsx
        │
        ├── pages/
        │   └── Home.jsx
        │
        ├── components/
        │   ├── atoms/
        │   │   └── Button/
        │   │       ├── Button.jsx
        │   │       ├── Button.stories.jsx
        │   │       └── Button.test.jsx
        │   │
        │   ├── molecules/
        │   │
        │   └── organisms/
        │       └── AppShell/
        │           ├── AppShell.jsx
        │           ├── AppShell.stories.jsx
        │           └── AppShell.test.jsx
        │
        └── styles/
            └── theme.css
```

Empty directories should not be created merely for future possibilities.

For example, do not create:

```text
domain/
services/
hooks/
utils/
state/
```

until a real requirement needs them.

---

# Atomic Design

Finora uses Atomic Design for its UI architecture.

## Atoms

Atoms are small, reusable UI primitives.

Examples:

```text
Button
Input
Icon
Badge
Label
Typography
```

Atoms should generally:

* be reusable
* be predictable
* receive data through props
* avoid business logic
* avoid routing knowledge
* avoid direct API/service calls

---

## Molecules

Molecules compose multiple atoms into a meaningful reusable UI unit.

Examples:

```text
SearchField
FormField
TransactionItem
AmountInput
```

Create molecules only when an actual composition is needed.

Do not create molecules simply to satisfy the architecture.

---

## Organisms

Organisms are larger UI compositions representing meaningful product sections.

Examples:

```text
AppShell
TransactionList
DashboardSummary
ExpenseForm
BudgetOverview
```

Organisms should primarily handle UI composition.

Avoid coupling organisms directly to infrastructure or services unless there is a strong architectural reason.

---

## Pages

Pages compose organisms and represent application screens/routes.

Examples:

```text
Home
Transactions
Budgets
Reports
Settings
```

Pages may coordinate:

* application state
* data
* domain logic
* services

when those concerns actually exist.

---

# Storybook

Finora uses Storybook as part of its design-system and component-development workflow.

Use:

```text
@storybook/react-vite
```

when configuring Storybook for the React + Vite application.

Stories should be colocated with the component:

```text
Button/
├── Button.jsx
├── Button.stories.jsx
└── Button.test.jsx
```

Avoid creating large centralized folders such as:

```text
stories/
tests/
```

unless there is a concrete reason.

Storybook should initially focus on Finora components.

Do not unnecessarily expose the portfolio's components in Finora's Storybook.

---

# Testing

Use:

* Vitest
* React Testing Library
* jest-dom
* jsdom

Tests should be colocated with the implementation whenever practical.

Example:

```text
Button/
├── Button.jsx
├── Button.stories.jsx
└── Button.test.jsx
```

Testing priorities:

1. Financial/domain logic
2. Component behavior
3. Important user interactions
4. Page/integration behavior

Do not create tests that only verify implementation details.

Prefer testing observable behavior.

The portfolio itself is not required to receive the same testing architecture unless a future requirement justifies it.

---

# Finora Styling

Finora has its own visual identity and theme.

Finora styles must not accidentally override the portfolio's global styles.

Prefer scoped or isolated Finora design tokens.

For example:

```css
.finora {
  --finora-color-primary: ...;
  --finora-color-background: ...;
}
```

Avoid blindly redefining global variables such as:

```css
:root {
  --primary: ...
}
```

if doing so could affect the portfolio.

The portfolio and Finora should be able to evolve independently.

---

# Financial Domain Rules

Finora is a financial application.

Financial correctness has priority over convenience.

When implementing monetary calculations:

* Do not use JavaScript floating-point arithmetic for financial values.
* Do not silently round monetary values.
* Do not silently convert currencies.
* Represent monetary values using an explicit and deterministic strategy.
* Keep financial calculations testable and deterministic.
* Separate presentation formatting from financial calculations.

Before implementing significant financial calculations, document the chosen money representation and related decisions in an ADR.

Potential domain concepts include:

```text
Account
Transaction
Income
Expense
Category
Budget
Financial Goal
```

Do not implement all of these simply because they are listed here.

Implement them when product requirements require them.

---

# Dependencies

Do not add dependencies unless they solve a concrete requirement.

Before adding a dependency:

1. Check whether the existing stack already solves the problem.
2. Consider whether a small local abstraction is sufficient.
3. Consider bundle size and maintenance cost.
4. Explain why the dependency is needed.

Expected dependencies for the Finora foundation may include:

```text
react-router-dom
vitest
@testing-library/react
@testing-library/jest-dom
jsdom
storybook
@storybook/react-vite
```

Do not add additional libraries for:

* state management
* forms
* charts
* dates
* financial calculations
* API clients

until an actual requirement justifies them.

---

# Performance

Finora should be lazy-loaded from the portfolio when practical.

The portfolio should not unnecessarily load the complete Finora application bundle on the initial portfolio visit.

Use route-level lazy loading where appropriate.

Avoid premature performance optimization.

Measure or identify a real problem before introducing complex optimization.

---

# Accessibility

Accessibility is a first-class requirement.

Components should:

* use semantic HTML
* support keyboard navigation
* provide accessible labels
* maintain appropriate focus behavior
* use sufficient color contrast
* avoid relying exclusively on color
* expose meaningful states to assistive technologies

Do not treat accessibility as a final cleanup step.

---

# Responsive Design

Finora must work across:

* mobile
* tablet
* desktop

Prefer responsive layouts and reusable components over device-specific implementations.

Do not create separate duplicated applications for mobile and desktop.

---

# Code Quality

Prefer:

* clear names
* small focused components
* simple data flow
* explicit dependencies
* predictable behavior
* reusable components when reuse is real
* composition over unnecessary inheritance
* readable code over clever code

Avoid:

* premature abstractions
* unnecessary generic components
* giant components
* duplicated business logic
* hidden side effects
* magic numbers
* unnecessary global state

---

# Product Architecture

Finora is also a portfolio case study.

Technical decisions should demonstrate engineering maturity.

When a decision has meaningful architectural consequences, document it through an ADR.

Examples:

```text
docs/
└── adr/
    ├── 001-money-representation.md
    ├── 002-state-management.md
    └── ...
```

Only create ADRs for decisions that are meaningful enough to document.

Do not create ADRs for trivial implementation details.

---

# Claude Code Workflow

Claude Code should work incrementally.

Before implementation:

1. Understand the requirement.
2. Inspect relevant files.
3. Identify the smallest valid change.
4. Explain the proposed approach when the change is architectural.
5. Implement only the approved scope.

After implementation:

1. Run relevant tests.
2. Run the build when appropriate.
3. Check for lint/type/build errors if configured.
4. Review the changed files.
5. Report what changed.
6. Report validation performed.
7. Report any unresolved issues.

---

# Task Scope

Do not modify unrelated files.

For a task such as:

> Add the Finora route

do not also:

* redesign the portfolio
* rewrite existing sections
* change unrelated styles
* introduce a new state-management library
* build financial features
* restructure the repository

Keep changes proportional to the task.

---

# Planning vs Implementation

For architectural or multi-file tasks:

1. Analyze first.
2. Produce a concise implementation plan.
3. Wait for approval when the requested workflow requires explicit approval.
4. Implement the approved plan.
5. Validate.

For small, obvious changes, implementation can proceed directly.

Do not spend excessive context generating plans for trivial changes.

---

# Token and Context Efficiency

Optimize Claude Code usage.

Prefer:

* focused prompts
* focused file inspection
* incremental implementation
* concise explanations
* targeted validation

Avoid:

* repeatedly reading the same files
* scanning the entire repository when unnecessary
* generating large speculative implementations
* unnecessary subagents
* rebuilding working code without a requirement

Use subagents only when they provide clear value, such as:

* independent analysis
* parallel research
* isolated investigation
* specialized review

For simple sequential tasks, work directly.


### Styling

* **DO NOT** use Tailwind classes directly in the JSX `className`.
* Each component must have its own `ComponentName.module.css` file next to the component file.
* Always import it as:
  `import s from './ComponentName.module.css'`
* Inside the `.module.css`, compose styles using `@apply` with the Tailwind utilities and tokens already configured (`primary`, `primarydark`, `ink`, `muted`, `bordercol`, `bg`, `success`, `danger`).
* For conditional or combined classes, use `clsx`, always imported as:
  `import cn from 'clsx'`
  `className={cn(s.button, isActive && s.buttonActive)}`
* Install `clsx` if it is not already included as a dependency.
* **DO NOT** use arbitrary Tailwind values in brackets for common typography and spacing (e.g. `text-[10.5px]`, `text-[13.5px]`, `p-[19px]`, `gap-[16px]`).
* Always use Tailwind's native scales:

  * Typography: `text-xs`, `text-sm`, `text-base`, `text-lg`, etc.
  * Spacing: `p-1`, `p-2`, `p-4`, `gap-2`, `gap-4`, etc.
* If a design value does not exactly match the native scale, round it to the nearest native value instead of creating an arbitrary value, unless the difference is visually significant. In that case, define the value once in `tailwind.config` (`theme.extend`) so it can be reused rather than using an isolated arbitrary value.

### Unique Identifiers

* Every button, link, input, and interactive icon must have a unique and descriptive `data-testid`.
* Format: `[component]-[element]-[role]`.
* Examples:

  * `"login-email-input"`
  * `"transaction-item-delete-icon"`
  * `"dashboard-add-transaction-button"`

### Callbacks

* **DO NOT** pass anonymous inline functions to `onClick`, `onChange`, or `onSubmit`.
* Handlers must be defined as named functions (use `useCallback` when they depend on props or state) and passed by reference:
  `onClick={handleDelete}`
  **Never:**
  `onClick={() => onDelete(id)}`

### UI Language

* Finora's UI copy must be in a single consistent language. Today that language is **English** — all visible text (labels, buttons, empty states, error messages, headings) must be in English.
* If a task's instructions quote a specific string in another language for a label or message, treat that as the *intent*, not literal copy to paste in verbatim — translate it to match the app's current UI language before using it, and flag the translation in your summary so it can be corrected if the literal wording mattered.
* This does not apply to code identifiers, `data-testid`s, comments, or conversation with the user — only to strings rendered in the UI.
* Proper internationalization (a language switcher, locale-aware currency formatting, etc.) is a separate, explicit future task — do not build it speculatively while fixing a language-consistency issue.

## Agent and Token Usage

* Use the subagents already defined in `.claude/agents/` when the task matches their purpose, instead of solving everything with the main agent.
* Be efficient with context: do not reread files that have already been reviewed during the session unless they have changed; do not explore folders outside the scope of the task; avoid long responses when a focused change is sufficient.


---

# Git

Use small, meaningful commits.

Commit messages should describe the actual change.

Examples:

```text
feat(finora): add application route
feat(finora): add app shell
feat(finora): configure storybook
test(finora): add button component tests
```

Do not mix unrelated changes into the same commit.

Do not commit secrets, API keys, credentials, or environment files containing sensitive values.

---

# Pull Request Convention

Every pull request must fill in the following sections from `.github/PULL_REQUEST_TEMPLATE.md`:

* Context
* Description
* Architecture
* Modules created/modified
* Tests

When creating a PR — whether via `gh pr create` or any other method — the PR body must follow this full template structure, not a generic summary.

Do not leave a section empty when it applies. If a section genuinely does not apply (e.g. no SQL migrations), state that explicitly instead of omitting the section.

"Pending / out of scope" is optional and should only be filled when there is something meaningful to note.

---

# Deployment

The application is intended to be deployed to Vercel.

Because the project uses client-side routing, direct navigation and browser refreshes on routes such as:

```text
/finora
```

must work correctly in production.

When routing is introduced, verify that the deployment configuration supports SPA fallback/rewrites.

Do not consider the route complete until direct navigation has been considered.

---

# Definition of Done

A feature is not complete merely because the code compiles.

Depending on the task, verify:

* functionality works
* route works
* responsive behavior is considered
* accessibility is considered
* tests pass
* Storybook stories work when applicable
* build succeeds
* no unrelated files were modified
* architecture remains coherent
* no unnecessary dependency was introduced

---

# Important Rule

When there is a conflict between this document and the actual repository structure, inspect the repository and `architect.md` first.

Do not blindly apply this document.

The goal is not to maximize architecture.

The goal is to build a high-quality professional portfolio and a credible production-oriented Finora application with the **simplest architecture that correctly supports the requirements**.
