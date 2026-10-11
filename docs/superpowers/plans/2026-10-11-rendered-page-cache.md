# Latest rendered page cache implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Implementation was subsequently authorized in the conversation.

**Goal:** Cache successful HTML for active pages' current revision in optional Redis, including explicit requests for that same revision, and invalidate affected renders on mutations.

**Architecture:** Reuse the startup Redis client. Add a dependency-injected RenderCacheService and a page-specific RenderService entry point; keep generic rendering uncached. Cache a locale-specific bundle containing HTML with and without section-edit buttons and redirect metadata, while authorization and response metadata remain live.

**Tech stack:** Existing redis, Sequelize, Express, renderer, and Jest dependencies; no new packages.

**Spec:** The user's latest-revision caching request in this conversation.

## Global constraints

- Redis remains optional. With no client, render normally without caching.
- Historical revisions, deleted pages, previews, parser errors, and template argument renders are never cached.
- Explicit revision requests still undergo revision-specific permission and history validation before cache lookup.
- Cache successful sanitized HTML only, not complete API responses. Categories, view counts, permissions, user-page flags, revision labels, canonical URLs, and redirect-from information remain request-specific.
- Cache keys are namespaced separately from sessions and include the actual selected locale and renderer format version. Each title/locale stores only the current revision, not a revision archive.
- Preserve both existing view modes: section-edit buttons for ordinary views, no section-edit buttons for explicit revision views; preserve request-specific redirect behavior.
- Dependency invalidation is awaited after committed writes. Existing nontransactional mutation sequences need failure-safe invalidation if a partial write occurred.

## Review focus

- A string revision is normalized and compared with the live page revision; fromHistory alone never determines cache eligibility.
- Purge/recreate may reuse a revision number; compare page identity and source fingerprint as well as revision.
- An in-flight render must not repopulate an entry invalidated by a template mutation.
- Template content can contain normal links or file macros absent from the including page's raw source.
- Redis errors or reconnects must not resurrect previously valid but now stale renders.

## Tasks

### 1. Redis cache storage and wiring

**Files:** Create `src/services/RenderCacheService.js` and its test; modify `src/services/index.js` and `server.js`.

**Interfaces:** `get(title, locale, pageIdentity)` returns an eligible bundle or null; `putIfUnchanged(...)` publishes only if the generation has not changed; `invalidatePages(titles)` invalidates every locale variant; `invalidateAll()` changes a shared render-cache epoch.

- [ ] Test disabled Redis, TTL expiry, source/revision identity mismatches, concurrent invalidation, and Redis failure fallback.
- [ ] Implement page-scoped generation tokens and atomic compare-and-publish using Redis. Atomically advance a generation and remove bundles on invalidation. Do not expire generation tokens in a way that permits old renders to publish after token reuse.
- [ ] Use a five-minute payload TTL as an additional bound on missed invalidation. Do not scan Redis keys or flush session data.
- [ ] Pass the existing client from `server.js` into `ServiceFactory`; inject one cache service into page, history, file, and render services. Reuse `src/utils/redisClient.js:initRedis` and existing shutdown handling.
- [ ] On reconnect/startup, rotate a shared rendered-cache epoch before accepting cache hits. Cache-operation errors bypass caching and are logged; mutation failures to invalidate disable cache use until epoch recovery. This does not change Redis session availability behavior.

### 2. Latest-revision lookup and shared rendering

**Files:** Modify `src/services/PageService.js:getPage`, `src/services/RenderService.js`, and `src/controllers/pages/viewGet.js`; extend service/controller tests.

**Interfaces:** Add `RenderService.renderPage(...)` for authorized persisted-page views; generic `render(...)` remains uncached. Extend getPage's internal result with live current-revision and cache-eligibility metadata while retaining the selected historical content where necessary.

- [ ] Test ordinary latest views, explicit latest revisions, older revisions, deleted pages, revision protection, locales, headings, redirects, and file-page prefixes.
- [ ] `PageService.getPage` normalizes revision input, retains the live page record, validates requested history, and reports eligible only for an active page whose selected revision equals the live current revision. Check content consistency before using the live entry.
- [ ] Both branches of `viewGet` call `renderPage` after `getPage`. Pass selected locale from i18n, source/prefix, view options, and redirect behavior explicitly.
- [ ] On a miss, render once through preprocessing/dependency resolution; produce both section-button variants from the same resolved input. Cache a successful sanitized bundle with optional redirect target metadata. On hit, choose the correct variant and apply request-specific redirect policy.
- [ ] Recheck live identity after rendering and atomically compare the cache generation before publishing. A request already in flight may finish with its snapshot; it must not install that snapshot as a valid future entry after invalidation.
- [ ] Bypass caching when extension hooks are registered unless they explicitly declare deterministic/cache-safe behavior. Bypass time-dependent and page-count macros, including those encountered while rendering includes and arguments, propagating uncacheability to the root render.

### 3. Mutation and dependency invalidation

**Files:** Modify `src/services/PageService.js`, `src/services/HistoryService.js`, `src/services/FileService.js`, `src/repositories/PageRepository.js`, and `src/admin/commands/genbacklinks.js`; extend tests.

**Interfaces:** Add an unpaginated, deduplicated incoming-link query to PageRepository. Add `RenderCacheService.invalidateForPageChange(title, { existenceChanged })` to select affected titles through this query and call `invalidatePages`.

- [ ] Test edits/creates/restores, delete/purge, revert, move, same destination with both relation types, template chains/cycles, links in templates, file macros, and failed/partial mutations.
- [ ] `PageService.editPage`: invalidate its own title and including pages on every edit; on create/restore also invalidate normal link sources.
- [ ] `PageService.deletePage` and `purgePage`: invalidate own title and all incoming normal/include sources after the committed change.
- [ ] `PageService.movePage`: invalidate both old and new titles and all incoming sources; source-link updates are already performed by movePageWithRedirect.
- [ ] `HistoryService.revertPage`: invalidate the resulting current page and its including sources; restoring a deleted page is also an existence change.
- [ ] `FileService.uploadPostProcess` and `purgeFile`: perform page invalidation and invalidate the entire rendered-cache epoch for file-macro consumers, since the links table does not index file macros. Invalidate after file-record changes even if later page operations fail.
- [ ] For every affected page, follow incoming include edges recursively with a visited set. Never paginate dependency discovery. Normal link sources are included on existence changes; include ancestors of those sources are also included. Including pages retain links to missing targets, so later creation invalidates them.
- [ ] Catch partial-write failures at the owning service and invalidate conservatively in a finally/error path. Do not treat an invalidation failure as a rolled-back SQL mutation.
- [ ] `GENBACKLINKS.f`: invalidate the rendered namespace after a successful rebuild. Existing content needs a rebuild before selective invalidation can be trusted; bypass/select global invalidation until this prerequisite is satisfied.
- [ ] Expose explicit invalidateAll/invalidateForPageChange methods for extensions, imports, and maintenance tools. Renderer/sanitizer/configuration deployments rotate the cache epoch. ACL changes need no HTML eviction because reads always reauthorize and personalized metadata is uncached.

### 4. Verification

- [ ] Run focused service/repository/controller tests and scoped lint, then the complete backend test suite.
- [ ] Use a disposable Redis instance to test both HTML variants, latest/older revision behavior, invalidation across two service instances, TTL, and concurrent render/invalidate publication.
- [ ] Verify GET responses retain the existing shape and authorization behavior; do not change frontend consumers for this feature.

## Limitations

- SQL mutations and Redis invalidation are not one distributed transaction. There is a small commit-to-invalidation window, and missed invalidations during asymmetric failures cannot be made strictly consistent by TTL/reconnect recovery. A transactional SQL outbox/version mechanism would be required for stronger guarantees.
- Direct database/extension writes that bypass invalidation can leave cached renders stale until TTL or namespace reset. Regex-derived links can miss dynamically generated dependencies; hooks are bypassed, and the dependency table must be rebuilt. If future renderer behavior creates additional dependencies, record them or conservatively invalidate/bypass.
- Reads still query SQL for current identity/history and permissions; this saves rendering and render-time lookups, not all database work.
- Two HTML variants and locale variants increase storage. Entries are lazily rebuilt; a high-fanout template change causes temporary misses and potentially repeated concurrent rendering.
- Dynamic macros and hooks are intentionally uncached in the first version. File changes use broad invalidation until file dependencies are indexed.
- No eager background warming, cross-process single-flight locks, nested-include support changes, or historical render caching are part of this plan.

## Execution decisions

- The user selected file macros as include-style dependencies on `File:<filename>` instead of broad invalidation. The startup dependency backfill is versioned and transactional.
- Time-dependent macros use midnight-capped expiry rather than bypassing the cache; this propagates through included content and arguments. `pagecount` uses the ordinary five-minute TTL.
- Deterministic hooks may explicitly declare `cacheSafe = true`; the bundled Interwiki hook does so. Other hooks bypass caching.
- The existing shared workspace is retained to preserve the user's uncommitted changes; no commits or branch integration are performed.
