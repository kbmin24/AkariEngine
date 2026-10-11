import { jest } from '@jest/globals';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createClient } from 'redis';
import RenderCacheService, { cacheExpiresAt } from './RenderCacheService.js';
import RenderService from './RenderService.js';
import FileService from './FileService.js';
import PageService from './PageService.js';
import HistoryService from './HistoryService.js';
import extractLinks from '../utils/extractLinks.js';
import viewGet from '../controllers/pages/viewGet.js';
import config from '../config/index.js';

test('time-dependent cache expiry is capped at local midnight', () => {
    const now = new Date(2026, 9, 11, 23, 59, 58, 500);
    expect(cacheExpiresAt(now, true)).toBe(new Date(2026, 9, 12).getTime());
    expect(cacheExpiresAt(now, false)).toBe(now.getTime() + 300000);
});

const redisAvailable = spawnSync('redis-server', ['--version']).status === 0;
(redisAvailable ? describe : describe.skip)('render caching with disposable Redis', () => {
    let server, client, cache, renderer, pages, files, relations, repository;
    beforeAll(async () => {
        const probe = createServer();
        probe.listen(0, '127.0.0.1');
        await once(probe, 'listening');
        const port = probe.address().port;
        await new Promise(resolve => probe.close(resolve));
        server = spawn('redis-server', ['--bind', '127.0.0.1', '--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: ['ignore', 'pipe', 'pipe'] });
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Redis test startup timeout')), 5000);
            server.stdout.on('data', chunk => {
                if (chunk.toString().includes('Ready to accept connections')) { clearTimeout(timeout); resolve(); }
            });
            server.once('error', error => { clearTimeout(timeout); reject(error); });
            server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Redis exited: ${code}`)); });
        });
        client = createClient({ url: `redis://127.0.0.1:${port}` });
        client.on('error', () => {});
        await client.connect();
    });
    afterAll(async () => {
        if (client?.isOpen) await client.close();
        if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
    });
    beforeEach(async () => {
        pages = new Map([['Page', { id: 1, title: 'Page', currentRev: 1, content: '= Heading =\nhello', deleted: false }]]);
        files = new Map();
        relations = [];
        repository = {
            findByTitle: async title => pages.get(title),
            findByTitleBatch: async titles => titles.map(title => pages.get(title)).filter(page => page && !page.deleted),
            findManyByTitles: async titles => titles.map(title => pages.get(title)).filter(page => page && !page.deleted),
            findIncomingLinks: async (titles, includeOnly) => relations.filter(row => titles.includes(row.dest) && (!includeOnly || row.isInclude)),
            count: async () => pages.size
        };
        cache ??= new RenderCacheService(client, { findIncomingLinks: (...args) => repository.findIncomingLinks(...args) });
        await cache.invalidateAll();
        renderer = new RenderService(repository, { findByFilenameBatch: async names => names.map(name => files.get(name)).filter(Boolean) }, cache);
        global.hooks = { beginRender: [], endRender: [] };
        global.sanitiseOptions = config.sanitiseOptions;
    });
    const render = (renderer, page, locale = 'en_GB', buttons = true) => renderer.renderPage(page, page.content, key => `${locale}:${key}`, { pagename: page.title, renderSectionEditButton: buttons }, false, locale);

    test('ordinary and explicit latest views share a render bundle without sharing edit buttons', async () => {
        const page = pages.get('Page');
        const ordinary = await render(renderer, page);
        expect(ordinary.html).toContain('ren-header-edit');
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        const explicit = await render(renderer, { ...page, fromHistory: true }, 'en_GB', false);
        expect(explicit.html).not.toContain('ren-header-edit');
        expect(explicit.html).toContain('hello');
        expect(parse).not.toHaveBeenCalled();
        await render(renderer, page, 'ko_KR');
        expect(parse).toHaveBeenCalledTimes(1);
    });

    test('older revisions are rendered but never stored in Redis', async () => {
        await render(renderer, pages.get('Page'));
        const historical = { ...pages.get('Page'), currentRev: 0, content: 'old', fromHistory: true };
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        expect((await render(renderer, historical)).html).toContain('old');
        await render(renderer, historical);
        expect(parse).toHaveBeenCalledTimes(2);
        await render(renderer, pages.get('Page'));
        expect(parse).toHaveBeenCalledTimes(2);
    });

    test('uploading a missing file invalidates cached error HTML, including template consumers', async () => {
        pages.get('Page').content = '[include(Template)]';
        pages.set('Template', { title: 'Template', content: '[file(foo.jpg)]', currentRev: 1 });
        relations.push({ source: 'Template', dest: 'File:foo.jpg', isInclude: true }, { source: 'Page', dest: 'Template', isInclude: true });
        expect((await render(renderer, pages.get('Page'))).html).toContain('File not found');
        files.set('foo.jpg', { filename: 'foo.jpg', filenameOnDisk: 'uploaded.jpg' });
        await cache.invalidateForPageChange('File:foo.jpg', { existenceChanged: true });
        expect((await render(renderer, pages.get('Page'))).html).toContain('uploaded.jpg');
    });

    test('midnight expires dday inside an included template', async () => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'] });
        try {
            jest.setSystemTime(new Date(2026, 9, 11, 23, 59, 59));
            pages.get('Page').content = '[include(Template)]';
            pages.set('Template', { title: 'Template', content: '[dday(2026-10-11)]' });
            expect((await render(renderer, pages.get('Page'))).html).toContain('+0');
            jest.setSystemTime(new Date(2026, 9, 12, 0, 0, 1));
            expect((await render(renderer, pages.get('Page'))).html).toContain('+1');
        } finally { jest.useRealTimers(); }
    });

    test('invalidation prevents an in-flight render from publishing stale content', async () => {
        const snapshot = await cache.get('Page', 'en_GB', 'identity');
        await cache.invalidateForPageChange('Page');
        expect(await cache.putIfUnchanged(snapshot, 'identity', { html: 'stale' }, Date.now() + 300000)).toBe(false);
        expect((await cache.get('Page', 'en_GB', 'identity')).bundle).toBeNull();
    });

    test('existence changes invalidate normal links and include ancestors without looping', async () => {
        relations.push({ source: 'Page', dest: 'Missing', isInclude: false }, { source: 'Parent', dest: 'Page', isInclude: true }, { source: 'Page', dest: 'Parent', isInclude: true });
        const affected = await cache.invalidateForPageChange('Missing', { existenceChanged: true });
        expect(new Set(affected)).toEqual(new Set(['Missing', 'Page', 'Parent']));
    });

    test('file upload invalidates missing file renders even when subsequent page creation fails', async () => {
        const previousConfig = global.conf;
        const previousRegex = global.legalFilenameRegex;
        global.conf = {};
        global.legalFilenameRegex = /^.+$/;
        pages.get('Page').content = '[file(foo.jpg)]';
        relations.push(...extractLinks('Page', pages.get('Page').content));
        await render(renderer, pages.get('Page'));
        const service = new FileService(
            { editPage: async () => { throw new Error('page write failed'); } },
            { requireLoginAccess: async () => {} },
            { create: async (filename, filenameOnDisk) => { files.set(filename, { filename, filenameOnDisk }); } },
            repository, cache
        );
        try {
            await expect(service.uploadPostProcess({ filename: 'foo.jpg', filenameOnDisk: 'upload.jpg', filePageName: 'File:foo.jpg' })).rejects.toThrow('page write failed');
            expect((await render(renderer, pages.get('Page'))).html).toContain('upload.jpg');
        } finally { global.conf = previousConfig; global.legalFilenameRegex = previousRegex; }
    });

    test('editing a template through PageService invalidates cached including pages', async () => {
        pages.get('Page').content = '[include(Template)]';
        pages.set('Template', { title: 'Template', content: 'before', currentRev: 1 });
        relations.push({ source: 'Page', dest: 'Template', isInclude: true });
        await render(renderer, pages.get('Page'));
        repository.upsertPage = async (title, content, currentRev) => {
            const page = { ...pages.get(title), title, content, currentRev };
            pages.set(title, page);
            return { page };
        };
        repository.replaceLinksForPage = async (title, content) => { relations = relations.filter(row => row.source !== title).concat(extractLinks(title, content)); };
        const service = new PageService(repository, { create: async () => {} }, { extractFromContent: () => [], registerForPage: async () => {} }, { requireWriteAccess: async () => {} }, null, null, null, cache);
        await service.editPage({ title: 'Template', content: 'after', user: 'Alice', ipAddress: '127.0.0.1' });
        expect((await render(renderer, pages.get('Page'))).html).toContain('after');
    });

    test('pagecount renders are cached normally', async () => {
        pages.get('Page').content = '[pagecount]';
        await render(renderer, pages.get('Page'));
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        await render(renderer, pages.get('Page'));
        expect(parse).not.toHaveBeenCalled();
    });

    test('unsafe hooks bypass caching, while declared deterministic hooks preserve their output', async () => {
        const hook = input => ({ input: input + '\nhooked' });
        global.hooks.beginRender = [hook];
        await render(renderer, pages.get('Page'));
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        await render(renderer, pages.get('Page'));
        expect(parse).toHaveBeenCalledTimes(1);
        hook.cacheSafe = true;
        expect((await render(renderer, pages.get('Page'))).html).toContain('hooked');
        parse.mockClear();
        expect((await render(renderer, pages.get('Page'))).html).toContain('hooked');
        expect(parse).not.toHaveBeenCalled();
    });

    test('redirect policy is selected per request from a cached bundle', async () => {
        pages.get('Page').content = '#redirect Target';
        const withRedirect = () => renderer.renderPage(pages.get('Page'), '#redirect Target', key => key, { pagename: 'Page', renderSectionEditButton: true }, true, 'en_GB');
        expect(await withRedirect()).toEqual({ result: 'redirect', html: 'Target' });
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        const withoutRedirect = await render(renderer, pages.get('Page'));
        expect(withoutRedirect.result).toBe('ok');
        expect(withoutRedirect.html).toContain('#redirect Target');
        expect(parse).not.toHaveBeenCalled();
    });

    test('HTTP page views use cache for an explicit latest revision but still enforce permissions', async () => {
        let denied = false;
        const pageService = new PageService(repository, {
            findByPageAndRev: async (title, rev) => ({ page: title, rev, content: pages.get(title).content })
        }, null, { requireReadAccess: async () => { if (denied) throw new Error('read denied'); } });
        const request = {
            app: { locals: { services: {
                page: pageService, render: renderer,
                permission: { hasPermission: async () => false },
                viewcount: { incrementViewCount: async () => {} },
                category: { getCategoriesForPage: async () => [] }
            } } },
            params: { name: 'Page' }, query: {}, session: {}, ipAddress: '127.0.0.1', getLocale: () => 'en_GB'
        };
        const response = { __: key => `en_GB:${key}`, json: jest.fn(value => value) };
        await viewGet(request, response);
        const parse = jest.spyOn(renderer, 'parseAndPreprocess');
        request.query = { rev: 1 };
        const explicit = await viewGet(request, response);
        expect(explicit.content).not.toContain('ren-header-edit');
        expect(explicit.rev).toBe(1);
        expect(parse).not.toHaveBeenCalled();
        denied = true;
        await expect(viewGet(request, response)).rejects.toThrow('read denied');
    });

    test('rendering survives Redis downtime and rejects stale entries after recovery', async () => {
        pages.get('Page').content = '[include(Template)]';
        pages.set('Template', { title: 'Template', content: 'before' });
        relations.push({ source: 'Page', dest: 'Template', isInclude: true });
        await render(renderer, pages.get('Page'));
        await client.close();
        try {
            pages.get('Template').content = 'after';
            await cache.invalidateForPageChange('Template');
            expect((await render(renderer, pages.get('Page'))).html).toContain('after');
        } finally { await client.connect(); }
        expect((await render(renderer, pages.get('Page'))).html).toContain('after');
    });

    test.each(['Target', 'CategoryTheory', '분류법'])('target creation and deletion refresh cached missing-link styling: %s', async title => {
        pages.get('Page').content = `[[${title}]]`;
        relations.push(...extractLinks('Page', pages.get('Page').content));
        expect((await render(renderer, pages.get('Page'))).html).toContain('ren_nosuchpage');
        repository.upsertPage = async (title, content, currentRev) => {
            const page = { id: 2, title, content, currentRev, deleted: false };
            pages.set(title, page);
            return { page };
        };
        repository.replaceLinksForPage = async () => {};
        repository.softDeletePageWithHistory = async ({ title }) => { pages.get(title).deleted = true; };
        const service = new PageService(repository, { findLatestRevByPage: async () => 0, create: async () => {} }, { extractFromContent: () => [], registerForPage: async () => {} }, { requireWriteAccess: async () => {}, requireLoginAccess: async () => {} }, null, null, null, cache);
        await service.editPage({ title, content: 'created', user: 'Alice' });
        expect((await render(renderer, pages.get('Page'))).html).not.toContain('ren_nosuchpage');
        await service.deletePage({ title, user: 'Alice' });
        expect((await render(renderer, pages.get('Page'))).html).toContain('ren_nosuchpage');
    });

    test('reverting a template refreshes its cached consumers', async () => {
        pages.get('Page').content = '[include(Template)]';
        pages.set('Template', { title: 'Template', content: 'before' });
        relations.push({ source: 'Page', dest: 'Template', isInclude: true });
        await render(renderer, pages.get('Page'));
        repository.revertPageToRevision = async () => { pages.get('Template').content = 'reverted'; return { reverted: true }; };
        const history = new HistoryService(null, repository, { requireWriteAccess: async () => {} }, cache);
        await history.revertPage({ title: 'Template', revertRev: 1, user: 'Alice' });
        expect((await render(renderer, pages.get('Page'))).html).toContain('reverted');
    });

    test('purging a file refreshes cached file consumers', async () => {
        pages.get('Page').content = '[file(foo.jpg)]';
        files.set('foo.jpg', { filename: 'foo.jpg', filenameOnDisk: 'upload.jpg' });
        relations.push(...extractLinks('Page', pages.get('Page').content));
        await render(renderer, pages.get('Page'));
        repository.purgePage = async () => { files.delete('foo.jpg'); return { purged: true, file: null }; };
        const service = new FileService(null, { requirePermission: async () => {} }, null, repository, cache);
        await service.purgeFile({ filename: 'foo.jpg', user: 'Alice' });
        expect((await render(renderer, pages.get('Page'))).html).toContain('File not found');
    });
});
