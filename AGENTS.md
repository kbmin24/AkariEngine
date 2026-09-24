# AGENTS.md

This file provides guidance to AI agents working in this repository.

## Project Overview

AkariEngine is a full-stack wiki engine. The backend is an ESM Node.js application built with Express 4, Sequelize, and Socket.IO; the frontend is a Nuxt 4/Vue 3 application. SQLite and MariaDB are supported, with optional Meilisearch integration. UI text and API errors are localized through the JSON files in `locales/`.

The repository also has two customization systems:

- `skins/` contains Vue layout components selected per user.
- `extensions/` contains server-side modules that can add routes, models, and render hooks.

## Setup and Commands

The backend and frontend have separate dependency trees.

```bash
# Backend (repository root)
npm install
npm start
npm test
npm run coverage
npx jest src/services/PageService.test.js
npx jest -t "test name pattern"
npx eslint src/routes/ src/controllers/ src/middlewares/ src/services/ src/repositories/ src/utils/ src/socket/

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

Copy `LocalSettings_Example.json` to `LocalSettings.json` before starting either application. During development, Nuxt proxies `/api`, `/css`, `/lib`, `/uploads`, and Socket.IO to the backend. Its target port comes from the `backendPort` environment variable and otherwise defaults to `2000`; keep this aligned with `port` in `LocalSettings.json`.

Run focused tests and lint for the files you change. `public/lib/` and `skins/Buma/` are intentionally ignored by the root ESLint configuration. Avoid treating generated Nuxt output or vendored browser libraries as source code.

## Repository Map

```text
server.js                 Express/Sequelize/Socket.IO bootstrap
src/config/               Local settings and database configuration
src/routes/               Express API route declarations and middleware chains
src/controllers/          HTTP request/response adapters
src/services/             Business rules, permissions, and domain operations
src/repositories/         Sequelize and Meilisearch data access
src/models/               Sequelize model factories
src/middlewares/          Authentication, authorization, validation, uploads, errors
src/socket/               Socket.IO namespaces and event handlers
src/utils/wikimark/       Wikitext lexer, parser, preprocessors, and render visitors
frontend/app/             Nuxt pages, components, composables, stores, and assets
frontend/server/          Nuxt server routes, including skin asset serving
skins/                    Dynamically discovered Vue skin layouts
extensions/               Optional backend extensions and the extension loader
locales/                  Shared translation catalogs
public/                   Backend-served static and vendored assets
uploads/                  User-uploaded files
```

## Runtime Architecture

The normal page flow is:

```text
browser -> Nuxt page/component -> /api request -> Express route
        -> controller -> service -> repository -> Sequelize model/database
```

`server.js` initializes the database models, repository and service factories, middleware, extensions, API routes, error handling, scheduled tasks, and Socket.IO. The constructed factories are available as `app.locals.repositories` and `app.locals.services`.

Express is an API and asset server. Routes registered by `src/routes/index.js` are mounted below `/api` and controllers normally return JSON. Nuxt owns user-facing routing and rendering. Keep HTTP concerns in routes/controllers and UI concerns in the frontend rather than introducing server-rendered page behavior.

Real-time discussion and developer-console behavior lives in `src/socket/`. The frontend connection wrapper is `frontend/app/composables/useSocket.js`. Apply the same authentication and permission expectations to socket events as to HTTP mutations.

## Backend Conventions

### Routes and Controllers

Route modules should remain declarative and thin:

- Validate parameters, queries, and bodies with `express-validator` and `validateRequest`.
- Apply rate limits, authentication/permission middleware, captcha checks, upload middleware, and CSRF protection at the route boundary as appropriate.
- Wrap asynchronous controllers with `asyncRoute()` from `src/utils/httpHelper.js`.
- Put request/response adaptation in controllers, then call `req.app.locals.services.*` for domain work.
- Return JSON with suitable HTTP status codes. Redirects for the SPA are represented as JSON such as `{ redirect: '/w/Title' }`.

Controllers may handle a domain error only when they must build a specialized response, such as the edit-conflict payload. Otherwise, let errors reach `src/middlewares/errorHandler.js`.

### Services and Permissions

Services own business rules and coordinate repositories. `PermissionService` is the authoritative access-control layer. Route middleware provides early rejection and stored ACL context, but it does not replace authorization inside sensitive service operations.

For protected reads and mutations, pass the relevant actor and request context—normally `user` from `req.session.username`, `ipAddress` from `req.ipAddress`, and revision information when applicable. New code must not bypass service authorization by calling a repository directly from a controller for a protected operation.

Services exposed by `ServiceFactory` include:

- `page`, `history`, `render`, `search`, and `category`
- `permission`, `block`, and `admin`
- `thread` and `recentDiscuss`
- `user` and `loginHistory`
- `file`, `viewcount`, and `recentChanges`

When adding a service or changing its dependencies, update `src/services/index.js`. Keep constructors dependency-injected so services can be tested without booting the server.

### Repositories and Models

Repositories contain persistence queries and mapping, not HTTP handling or business policy. Add repository dependencies in `src/repositories/index.js`; add Sequelize models in `src/models/` and wire their initialization in `server.js`. Preserve SQLite/MariaDB compatibility and use Sequelize APIs rather than dialect-specific SQL unless both dialects are handled explicitly.

Meilisearch is optional. Search and page-writing behavior must continue to work when no Meilisearch repository is configured.

### Errors, Localization, and Logging

Domain errors live in `src/services/errors.js`. Use the closest typed error (`ValidationError`, `PermissionDeniedError`, `AuthenticationRequiredError`, `PageNotFoundError`, `RevisionNotFoundError`, `CaptchaError`, `EditConflictError`, or another `AppError` subclass) and include an `i18nKey`/`i18nParams` when the message is user-facing.

The central error middleware serializes failures as JSON. Do not expose stack traces or raw internal errors to clients. Use `src/utils/logger.js` in backend code instead of `console.log`.

State-changing browser requests are protected with the double-submit CSRF middleware. Do not weaken or omit CSRF protection for cookie-authenticated mutations.

## Frontend Conventions

The frontend uses Nuxt file-based routing under `frontend/app/pages/`, shared UI under `components/`, reusable behavior under `composables/`, and Pinia state under `stores/`.

- Use `useAkariFetch()` for reactive/SSR-aware API reads and `useAkariRequest()` for imperative requests. These helpers attach the selected locale through the `akari-locale` header.
- Use `useCsrf().csrfFetch()` for cookie-authenticated mutations. It caches the CSRF token and retries once when the backend reports an expired/invalid token.
- Keep API paths relative (`/api/...`) so Nuxt's proxy works in development and deployment.
- Prefer localized message keys from the API; add or update matching entries in every supported file under `locales/` when introducing UI text.
- Keep browser-only APIs behind `import.meta.client` or the appropriate Nuxt lifecycle hook so SSR remains safe.
- Reuse existing composables for authentication, page headers, post-render processing, router content, sockets, and skin settings before adding parallel state or fetch logic.

The default layout dynamically imports `skins/*/index.vue`. A valid skin has an `index.vue` and `manifest.json`; optional assets, components, composables, and `skinSettings.json` stay within that skin directory. Do not hard-code one skin's DOM structure or styling into shared pages.

## Wikitext Rendering

`src/utils/wikimark/` implements the custom Chevrotain-based parser. The main stages are:

```text
lexer -> WikiParser CST -> PreprocessVisitor -> HTMLVisitor
```

`scanTokenMatches.js` pre-scans paired delimiters, `PlainTextVisitor.js` supports text extraction, and `macro.js`/`keywordHelper.js` support rendering behavior. Rendering also supports extension hooks before parsing and after HTML generation; final HTML must remain within the sanitizer policy from `src/config/index.js`.

Parser changes should include focused tests beside the parser modules. Cover valid nesting, malformed or unmatched delimiters, escaping, and sanitized output when relevant.

## Extensions and Skins

Enabled extensions are listed in `LocalSettings.json`. Each extension needs a `manifest.json` and a default-exported `main.js`. The extension manager supplies the Express app plus hook/model registration functions. See `extensions/README.md` for the supported contract. Treat global extension APIs as compatibility surfaces and avoid adding new global dependencies to core code.

Nuxt discovers skins from directories containing both `manifest.json` and `index.vue`. User skin selection is returned by `/api/me` and resolved by the default frontend layout, with `GECWiki` as the preferred fallback when installed.

## Configuration

Important `LocalSettings.json` fields include:

- `port`, `session_secret`, `appname`, `defaultLocale`, and `isPrivate`
- `database.type` plus `sqlite_options` or `mariadb_options`
- optional `meilisearch` connection settings
- upload type, MIME, and size limits
- `security.allowedIframeHostnames`
- captcha/Turnstile settings
- `extensions`, policy document paths, and administrator contact details

Never commit `LocalSettings.json`, secrets, database files containing user data, or uploaded private content. When adding configuration, update `LocalSettings_Example.json` and expose it through `src/config/index.js` rather than scattering direct file reads through backend code. Nuxt build-time configuration that must mirror local settings belongs in `frontend/nuxt.config.js`.

## Testing and Change Checklist

Tests use Jest with ESM support and are colocated as `*.test.js`. Service tests should mock repository dependencies; repository tests should focus on query/data behavior; parser tests should exercise the complete relevant parse/render stage.

For a cross-layer feature, check all affected contracts:

1. Route validation, rate limiting, authentication, CSRF, and permission middleware.
2. Controller request mapping and JSON response shape.
3. Service-level business rules and authorization.
4. Repository/model behavior for both supported databases.
5. Frontend loading, error, empty, and success states, including SSR behavior.
6. Locale entries and sanitization implications.
7. Focused backend tests, scoped lint, and a frontend production build when Vue/Nuxt code changes.

Preserve existing API response shapes unless the corresponding frontend consumers are updated in the same change.

## Code Style

- Use ESM `import`/`export`. For a CJS-only dependency, follow the `createRequire` pattern in `src/utils/ipTools.js`.
- Follow `.editorconfig`: UTF-8, LF endings, four-space indentation, final newline, and no trailing whitespace.
- Prefer single quotes in JavaScript; use double quotes when it improves escaping/readability.
- Use `camelCase` for values/functions, `PascalCase` for classes/components, and `UPPER_SNAKE_CASE` for constants.
- Keep route files as `*.routes.js`, services as `*Service.js`, repositories as `*Repository.js`, and Sequelize factories as `*.model.js`.
- Group imports from external packages, shared/internal modules, then local feature modules.
- Use `async`/`await` and `Promise.all` for independent work.
- Keep changes scoped and preserve public API, extension, skin, and localization contracts unless the task explicitly changes them.
