# Rendered page caching

When `redis.enabled` is explicitly `true`, page views cache successful sanitized HTML for the active page's current revision. The existing Redis client serves both sessions and rendering, under separate key namespaces. Without Redis, rendering works normally.

Ordinary views and explicit requests for the current revision share a locale-specific bundle with and without section-edit buttons. Older revisions, deleted pages, previews, and template argument renders are not independently cached. Permission and revision checks run before lookup. Other response fields remain live.

Entries normally expire after five minutes. If the page or its included content/arguments uses `dday`, `age`, or `agek`, expiry is also capped at the next midnight in the Node process's local timezone. `pagecount` uses the ordinary TTL.

File macros create `isInclude: true` links to `File:<filename>`, including references to files that do not exist. Uploading/purging a file invalidates these sources and their include ancestors. Edits, creates, restores, deletes, purges, moves, and reverts invalidate the corresponding page and affected dependencies. A versioned, transactional dependency rebuild runs once before caching starts on existing databases; this may make the first startup slower on large wikis. `GENBACKLINKS` also resets the rendered namespace after rebuilding.

Generation tokens prevent an invalidated in-flight render from publishing an entry. Redis errors bypass caching; reconnect/recovery resets the rendered namespace. This does not change session-store availability behavior. SQL commits and Redis invalidation are separate, so this is not a strict distributed consistency guarantee. Maintenance tools and extensions writing data directly must call `services.renderCache.invalidateForPageChange(title, { existenceChanged })` or `invalidateAll()`.

Render hooks bypass caching unless every registered begin/end render hook has `cacheSafe = true`. This declaration promises deterministic, nonpersonalized output, no required per-request side effects, and no additional dependencies that are absent from the link index. The bundled Interwiki hook meets this contract. Hooks still run when populating the cache; hits skip the end hook. Changes to hooks, sanitization, or deployment configuration require a rendered namespace reset (normal server startup performs one).

Tests use disposable local Redis processes with disk persistence disabled when `redis-server` is installed. Core tests and the pure expiry test still run without that executable; live Redis cases are skipped. Run `npm test -- --runInBand --coverage=false` to verify the backend.
