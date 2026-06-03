# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AkariEngine is a Node.js wiki engine (ESM, `"type": "module"`) built on Express 4, Sequelize ORM, and Socket.IO. It supports SQLite and MariaDB. The UI and content are primarily in Korean, but is undergoing a shift to i18n support.

**The backend refactor is largely complete.** When style conflicts arise, follow the conventions in `src/routes/pages.routes.js` and its dependencies.

**The frontend is being migrated from EJS to Nuxt.** EJS templates currently live in `skins/` (e.g. `skins/GECWiki/*.ejs`). Scripts in `public/js/` will be transitioned into Nuxt incrementally. No frontend conventions are established yet — do not introduce new EJS templates or new files in `public/js/` unless explicitly asked.

## Commands

```bash
npm install          # Install dependencies
npm start            # Start server (node server.js)
npm test             # Run all Jest tests
npm run coverage     # Run tests with coverage report
npx jest src/utils/wikimark/wikiparser.test.js          # Run one test file
npx jest -t "test name pattern"                         # Run tests matching a name
npx eslint src/routes/ src/controllers/ src/middlewares/ src/services/ src/repositories/ src/utils/
```

Lint notes:
- `public/lib/` is globally ignored by eslint config.
- Running `npx eslint .` reports many pre-existing violations in legacy frontend code — use scoped commands above.

## Configuration

Copy `LocalSettings_Example.json` to `LocalSettings.json` before starting. Key fields:
- `database.type`: `"sqlite"` (uses `sqlite_options.storage`) or `"mariadb"` (uses `mariadb_options`)
- `skins`: array of skin folder names under `skins/`
- `extensions`: array of extension folder names under `extensions/`
- `session_secret`: required for sessions
- `isPrivate`: if true, all routes require login

## Architecture

### Request Flow

```
server.js → src/routes/index.js → *.routes.js → src/controllers/**/*.js → src/services/*.js → src/repositories/*.js → Sequelize models
```

- **`server.js`**: Bootstraps Express, initializes Sequelize models, creates `RepositoryFactory` and `ServiceFactory`, attaches them to `app.locals`. Also sets up Socket.IO for the discussion thread chat system.
- **`src/routes/`**: Thin route files. Pass `services` and `options` (including `csrfProtection`) from the factory. Use `asyncRoute()` from `src/utils/httpHelper.js` for async handlers.
- **`src/controllers/`**: Handle request/response only. Delegate all logic to `req.app.locals.services.*`.
- **`src/services/`**: All business logic lives here. Permission checks are authoritative at this layer.
- **`src/repositories/`**: Sequelize data access. No business logic.

### Service and Repository Access

Routes and controllers access services via `req.app.locals.services.*`:
- `services.page` — `PageService`: read/write/move/delete/revert pages
- `services.history` — `HistoryService`: revision history, diffs
- `services.permission` — `PermissionService`: ACL, block checks
- `services.search` — `SearchService`
- `services.category` — `CategoryService`
- `services.thread` — `ThreadService`: discussion threads
- `services.block` — `BlockService`
- `services.viewcount` — `ViewcountService`
- `services.recentChanges` — `RecentChangeService`

### Permission Model

- `PermissionService` is the single source of truth for access control.
- Service methods for reading protected content and all write/mutation methods must always enforce permissions internally — do not rely solely on route middleware.
- Always pass `user` (`req.session.username`), `ipAddress` (`req.ipAddress`), and revision context where applicable.

### Error Handling

Typed domain errors in `src/services/errors.js`:
- `ValidationError` (400) — caught in controllers for UX-level handling
- `PermissionDeniedError` (403)
- `AuthenticationRequiredError` (401)
- `PageNotFoundError` (404)
- `RevisionNotFoundError` (404)
- `CaptchaError` (400)
- `AppError` — base class

Pattern: controllers catch only `ValidationError` for UX rendering; all other errors are re-thrown to `src/middlewares/errorHandler.js`.

### Wikitext Parser

`src/utils/wikimark/` contains a custom wiki markup parser built with [Chevrotain](https://chevrotain.io/):
- `tokens.js` — token definitions
- `lexer.js` — lexer
- `scanTokenMatches.js` — pre-scan for matched/unmatched delimiters
- `wikiparser.js` — `WikiParser` (CST parser)
- `HTMLVisitor.js` — CST visitor that produces HTML
- `PreprocessVisitor.js` — preprocessor pass

Tests for the parser live alongside the source files (`.test.js`).

A typical workflow would be: lexer.js → wikiparser. → PreprocessVisitor.js → HTMLVisitor.js

### Module System

Use ESM `import`/`export` everywhere. The sole exception: if a CJS-only package must be used, follow the pattern in `src/utils/ipTools.js` (using `require`).

### Key Shared Utilities

- `src/utils/httpHelper.js` — `asyncRoute`, `renderLayout`, `renderTemplateInLayout`, `BACK_LINK`, `LOGIN_LINK`
- `src/utils/logger.js` — shared logger; do not use `console.log` in backend code
- `src/utils/error.js` — `renderError` helper for rendering error pages
- `src/utils/paths.js` — path resolution helpers

## Code Style

- **Formatting**: UTF-8, LF line endings, 4-space indent (see `.editorconfig`)
- **Quotes**: single quotes preferred; use double when escaping helps
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- **File naming**: `*.routes.js`, `*Service.js`, `*Repository.js`
- **Import grouping**: external packages → internal utilities → local feature modules
- **Async**: `async/await` throughout; use `Promise.all` for independent async ops

## Reference Files for Refactor Style

- `src/routes/pages.routes.js`
- `src/middlewares/permission.js`
- `src/middlewares/validation.js`
- `src/utils/httpHelper.js`
- `src/controllers/pages/editGet.js`
- `src/controllers/pages/editPost.js`
- `src/services/PageService.js`
- `src/services/errors.js`
