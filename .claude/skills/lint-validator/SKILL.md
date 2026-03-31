---
name: lint-validator
description: Runs ESLint on both the frontend (Next.js) and backend (NestJS) of the Personal Finance Tracker monorepo. Use this skill after making code changes to verify that all linting rules pass. Triggers on requests like "run lint", "check lint", "validate code", or automatically after editing code via hooks.
---

# Lint Validator

Validates code quality by running ESLint across both projects in the monorepo. This catches type errors, unused variables, unsafe patterns, and formatting issues before they accumulate.

## How it works

1. Run `npm run lint` in the **backend** directory
2. Run `npm run lint` in the **frontend** directory
3. Report results clearly — which project passed/failed
4. If errors are found, attempt auto-fix and report what remains

## Execution

Run both linters in sequence. NVM must be sourced first since Node is managed via nvm.

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Step 1: Run backend lint

```bash
cd "/Users/akshay.gawari/Desktop/Projects/SelfProjects/Personal Finance Tracker/backend" && npm run lint 2>&1
```

### Step 2: Run frontend lint

```bash
cd "/Users/akshay.gawari/Desktop/Projects/SelfProjects/Personal Finance Tracker/frontend" && npm run lint 2>&1
```

### Step 3: Handle failures

If either linter reports errors:

1. Note which project failed and list the errors
2. Fix the lint errors in the source files directly — the ESLint rules for this project are:
   - **Backend** (`eslint.config.mjs`): Uses `typescript-eslint/recommendedTypeChecked` with `no-explicit-any: off`, `no-floating-promises: warn`, `no-unsafe-argument: warn`, and `argsIgnorePattern: ^_` for unused vars
   - **Frontend**: Standard Next.js ESLint config
3. After fixing, re-run `npm run lint` to confirm the fix worked
4. Report what was fixed vs what still needs manual attention

### Reporting format

```
## Lint Results

### Backend
Status: PASS / FAIL
Errors: <count> (if any)
<error details if failed>

### Frontend
Status: PASS / FAIL
Errors: <count> (if any)
<error details if failed>
```

## Common lint issues in this project

- `@typescript-eslint/no-unsafe-*` — Use proper type assertions instead of `any`
- `@typescript-eslint/require-await` — Remove `async` from functions with no `await`, or add `await Promise.resolve()` for stubs
- `@typescript-eslint/no-unused-vars` — Prefix unused params with `_` (backend allows this via `argsIgnorePattern`)
- `@typescript-eslint/no-floating-promises` — Add `void` before unhandled promise calls
- `@next/next/no-img-element` — Use `next/image` `<Image>` component instead of `<img>`
- `import type` required for types used in decorated signatures when `isolatedModules` is enabled
