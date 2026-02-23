# AGENTS.md

Guidance for agentic coding contributors in this repository.

This project is in a heavy backend refactor.
When styles conflict, follow the conventions used in `routes/pages.routes.js` and its dependencies first.

Key reference files:
- `routes/pages.routes.js`
- `middlewares/permission.js`
- `middlewares/validation.js`
- `utils/httpHelper.js`
- `controllers/pages/editGet.js`
- `controllers/pages/editPost.js`
- `services/PageService.js`
- `services/errors.js`

## Build / Lint / Test Commands

### Install and run
- Install dependencies: `npm install`
- Start server: `npm start`
- Equivalent start command: `node server.js`
- List npm scripts: `npm run`

### Build
- There is currently **no dedicated root build script**.
- Do not invent `npm run build` unless you add and document it in `package.json`.
- Ignore third-party nested build instructions unless explicitly editing that dependency subtree.

### Lint
- Lint is configured via flat config: `eslint.config.mjs`.
- Primary lint command: `npx eslint .`
- Current repo status: this command reports many existing violations (legacy code + vendor/frontend globals).

Use scoped lint commands during feature/refactor work:
- Backend refactor scope:
  - `npx eslint routes/**/*.js controllers/**/*.js middlewares/**/*.js services/**/*.js repositories/**/*.js utils/**/*.js`
- Narrow scope (fast check for touched files):
  - `npx eslint routes/pages.routes.js middlewares/permission.js utils/httpHelper.js`

Notes:
- `public/lib/` is globally ignored by eslint config.
- Many files in `public/js/` and skin assets are not clean under current rules; avoid broad lint-only churn.

### Tests
- Current test script is a placeholder:
  - `npm test` -> exits with `Error: no test specified`
- There is no first-party test framework wired at root yet.

### Single-test execution (important)
- There is no canonical single-test command **today** because tests are not set up.
- If you add tests, prefer Node built-in test runner first:
  - Run all tests: `node --test`
  - Run one file: `node --test tests/page-service.test.js`
  - Run one test by name: `node --test --test-name-pattern "editPage rejects empty title" tests/page-service.test.js`
- If project later adopts Jest:
  - One file: `npx jest tests/page-service.test.js`
  - One test by name: `npx jest tests/page-service.test.js -t "editPage rejects empty title"`
- If project later adopts Vitest:
  - One file: `npx vitest run tests/page-service.test.js`
  - One test by name: `npx vitest run tests/page-service.test.js -t "editPage rejects empty title"`

## Code Style Guidelines

## Priority order
- 1) Direct user task instructions.
- 2) This `AGENTS.md`.
- 3) Refactor-style files listed above.
- 4) Legacy local style in the edited file (only when needed for compatibility).

## Module system (important transition rule)
- **Use ESM `import` / `export`.**
- If an external library does not support ESM imports, use `require` as shown in `utils/ipTools.js`.

## Formatting
- Respect `.editorconfig`: UTF-8, LF line endings, 2-space indent, trimmed trailing whitespace, final newline.
- Keep functions and argument lists readable; split long calls across lines.
- Prefer single quotes in JS unless escaping makes double quotes clearer.
- Follow surrounding semicolon style within each file.

## Imports / dependency organization
- In ESM files, group imports by:
  - external packages
  - internal utilities/shared modules
  - local feature modules
- Keep import lists explicit and minimal; prefer named imports where clear.
- In legacy CJS files, keep `require(...)` at top and maintain existing style.

## Naming conventions
- `camelCase`: variables, params, functions.
- `PascalCase`: classes, service/repository constructors, custom error classes.
- `UPPER_SNAKE_CASE`: true constants.
- Existing file patterns to preserve:
  - routes: `*.routes.js`
  - services: `*Service.js`
  - repositories: `*Repository.js`

## Architecture and layering
- Keep route handlers thin: validate, delegate, respond.
- Put business logic in services.
- Put data access details in repositories.
- Prefer `req.app.locals.services.*` from routes/controllers in refactor paths.
- Reuse shared helpers from `utils/httpHelper.js` (`asyncRoute`, layout helpers).

## Permission-check contract (important)
- Treat service-layer permission checks as authoritative; do not rely only on route middleware for security.
- Middleware permission checks are allowed as edge guards (early rejection, store-mode UX), but must delegate to `PermissionService`.
- Do not duplicate ACL policy logic across routes/controllers/pages; centralize policy in `services/PermissionService.js`.
- For service methods that read protected content (`getPage`, `getRawContent`, diff/revision reads), always enforce read access in service.
- For write/mutation methods (`editPage`, `movePage`, `deletePage`, `revertPage`), always enforce write/admin permission in service.
- Always pass full request context into permission checks when available:
  - `user` (`req.session.username`)
  - `ipAddress` (`req.ipAddress`)
  - `revision` for revision-specific reads (`rev`, `rev1`, `rev2`)
- Route-level checks and service-level checks must agree on context keys to avoid mismatch bugs.

## editPost good practices (reference pattern)
- Treat `controllers/pages/editPost.js` as the model for write controllers in refactor paths.
- Delegate all page mutation logic to service layer (`req.app.locals.services.page.editPage(...)`), not controller logic.
- Pass a single options object to services (title/content/user/ip/comment/prefix/suffix) for readability and backward-safe extension.
- Keep success path minimal and explicit (single redirect/response, no extra branching).
- Catch only known typed domain errors (`ValidationError`) and map specific `i18nKey` values to UX responses.
- Re-throw unknown errors so centralized middleware handles logging and fallback rendering.
- Prefer i18n-backed error descriptions and structured error helper options (`description`, `returnLink`, `returnName`, `statusCode`).
- Preserve request context usage (`req.session.username`, `req.ipAddress`, `req`) when required for audit/security/business rules.

## Validation and contracts
- Use `express-validator` at route boundary.
- Run `validateRequest` immediately after validators.
- In services, still validate critical invariants and trust boundaries.
- Prefer options objects for multi-argument methods to make call sites clear.

## Error handling
- Use typed errors from `services/errors.js` (`ValidationError`, `PermissionDeniedError`, etc.).
- Throw early with meaningful metadata (`statusCode`, `i18nKey`, `details`, return links).
- In middleware wrappers, propagate with `next(error)` / `next(mappedError)`.
- In controllers, catch only known domain errors for UX handling; rethrow unknown errors.

## i18n and messages
- Prefer i18n keys for user-facing text.
- Keep fallback log/error text clear and actionable.
- Do not hardcode locale-specific strings in new backend logic when i18n path exists.

## Async and side effects
- Use `async/await` consistently.
- Avoid un-awaited promises unless intentionally fire-and-forget.
- Use `Promise.all` for independent async operations.
- Avoid blocking filesystem/database patterns in hot paths unless required.

## Logging
- Use shared logger utilities, not ad-hoc `console.log` in backend code.
- Log concise context: operation, actor, target identifiers.
- Never log secrets, passwords, session secrets, or sensitive tokens.

## Security-sensitive behavior
- Preserve CSRF middleware placement and behavior.
- Preserve permission/auth middleware ordering.
- Treat session and IP handling (`req.session.username`, `req.ipAddress`) as security-critical.
- Do not relax ACL/permission checks during refactors.

## Refactor policy
- Prefer incremental improvements aligned with refactor direction.
- Avoid sweeping rewrites unless explicitly requested.
- Keep behavior stable while improving structure.
- If touching mixed-style areas, align new code to refactor target style first.

## Cursor / Copilot rule files

Checked paths:
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

Current status:
- No Cursor rule files found.
- No Copilot instruction file found.

If these files are added later:
- Treat them as high-priority instructions.
- Update this file to reflect any mandatory rules.
