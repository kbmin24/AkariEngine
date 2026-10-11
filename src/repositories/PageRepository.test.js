import { Sequelize, DataTypes } from 'sequelize';
import { jest } from '@jest/globals';
import PageRepository from './PageRepository.js';
import linksFactory, { ensureLinksIncludeColumn } from '../models/links.model.js';
import genbacklinks from '../admin/commands/genbacklinks.js';

let db, pages, links, repository;
beforeEach(async () => {
    db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    pages = db.define('page', { title: DataTypes.STRING, content: DataTypes.TEXT, deleted: DataTypes.BOOLEAN });
    links = linksFactory(db);
    await db.sync();
    repository = new PageRepository(pages, { linkModel: links });
});
afterEach(async () => { await db.close(); });

test('extracts both include forms, trims titles, and keeps direct links distinct', () => {
    expect(repository.extractLinks('Source', '[[Target]] [[Target|label]] [InClUdE(Target)] [include(Target,a=b)] [INCLUDE]{{\n Template:공무원헤드라인 ,a=b\n}} [include]{{Other}}')).toEqual([
        { source: 'Source', dest: 'Target', isInclude: false },
        { source: 'Source', dest: 'Target', isInclude: true },
        { source: 'Source', dest: 'Template:공무원헤드라인', isInclude: true },
        { source: 'Source', dest: 'Other', isInclude: true }
    ]);
});

test('rejects multiline type A, empty includes, and incomplete macros', () => {
    expect(repository.extractLinks('Source', '[include(A\nB)] [include(A,\nx=y)] [include()] [include(,x=y)] [include]{{\n}} [include(Unclosed) [include]{{Unclosed')).toEqual([]);
});

test('include destinations are page titles even if they begin with category', () => {
    expect(repository.extractLinks('Source', '[[Category:Example]] [[https://example.com]] [include(Category:Example)]')).toEqual([
        { source: 'Source', dest: 'Category:Example', isInclude: true }
    ]);
});

test('default link type is direct', async () => {
    const row = await links.create({ source: 'Source', dest: 'Target' });
    expect(row.isInclude).toBe(false);
});

test('edits distinguish direct and include links to the same destination', async () => {
    await repository.replaceLinksForPage('Source', '[[Target]] [include(Target)]');
    expect(await links.count()).toBe(2);
    await repository.replaceLinksForPage('Source', '[include(Target)]');
    expect((await links.findAll()).map(row => row.isInclude)).toEqual([true]);
    await repository.replaceLinksForPage('Source', '[[Target]]');
    expect((await links.findAll()).map(row => row.isInclude)).toEqual([false]);
    await repository.replaceLinksForPage('Source', '');
    expect(await links.count()).toBe(0);
});

test('GENBACKLINKS shares extraction and skips deleted pages', async () => {
    await pages.bulkCreate([
        { title: 'Source', content: '[[Target]] [include]{{\nTarget\n}}' },
        { title: 'Deleted', content: '[include(Target)]', deleted: true }
    ]);
    const previous = global.db;
    global.db = { pages, links };
    try {
        await genbacklinks.f('', () => {});
        const rows = await links.findAll({ order: [['isInclude', 'ASC']] });
        expect(rows.map(({ source, dest, isInclude }) => ({ source, dest, isInclude }))).toEqual([
            { source: 'Source', dest: 'Target', isInclude: false },
            { source: 'Source', dest: 'Target', isInclude: true }
        ]);
    } finally { global.db = previous; }
});

test('moving a page refreshes the source of its include backlinks', async () => {
    await pages.create({ title: 'Source', content: '[include(Target)]' });
    await repository.replaceLinksForPage('Source', '[include(Target)]');
    await repository.movePageWithRedirect({ oldTitle: 'Source', newTitle: 'Moved', doneBy: 'Alice' });
    expect((await links.findAll()).map(row => row.source)).toEqual(['Moved']);
});

test('existing links tables gain the include column without losing direct links', async () => {
    await links.create({ source: 'Legacy', dest: 'Target' });
    await db.getQueryInterface().removeColumn(links.getTableName(), 'isInclude');
    await ensureLinksIncludeColumn(links);
    await ensureLinksIncludeColumn(links);
    const row = await links.findOne();
    expect(row.source).toBe('Legacy');
    expect(row.isInclude).toBe(false);
});

test('backlink queries include both relation types and paginate consistently', async () => {
    await repository.replaceLinksForPage('Source', '[[Target]] [include(Target)]');
    const result = await repository.findBacklinksByTitle('Target', { limit: 1, offset: 0 });
    expect(result.count).toBe(2);
    expect(result.rows).toHaveLength(1);
});

test('failed backlink rebuilding preserves existing rows', async () => {
    await links.create({ source: 'Existing', dest: 'Target' });
    await pages.create({ title: 'Source', content: '[include(Target)]' });
    const previous = global.db;
    global.db = { pages, links };
    const failure = jest.spyOn(links, 'bulkCreate').mockRejectedValue(new Error('write failed'));
    try {
        await expect(genbacklinks.f('', () => {})).rejects.toThrow('write failed');
        expect((await links.findAll()).map(row => row.source)).toEqual(['Existing']);
    } finally {
        failure.mockRestore();
        global.db = previous;
    }
});

test('file macros reference file pages even before a file exists', () => {
    expect(repository.extractLinks('Source', '[file(foo.jpg)] [FILE(foo.jpg,width=100)] [file]{{bar.pdf}} [[File:foo.jpg]]')).toEqual([
        { source: 'Source', dest: 'File:foo.jpg', isInclude: false },
        { source: 'Source', dest: 'File:foo.jpg', isInclude: true },
        { source: 'Source', dest: 'File:bar.pdf', isInclude: true }
    ]);
});

test('dependency backfill includes file macros and runs only once', async () => {
    const settings = db.define('setting', { user: DataTypes.STRING, key: DataTypes.STRING, value: DataTypes.TEXT });
    await settings.sync();
    await pages.create({ title: 'Source', content: '[file(foo.jpg)] [include(Template)]' });
    await repository.ensureLinkIndex(settings);
    expect((await links.findAll()).map(row => row.dest).sort()).toEqual(['File:foo.jpg', 'Template']);
    const rebuild = jest.spyOn(links, 'bulkCreate');
    await repository.ensureLinkIndex(settings);
    expect(rebuild).not.toHaveBeenCalled();
});

test('rendering lookups omit deleted link and include targets', async () => {
    await pages.bulkCreate([{ title: 'Active', content: '', deleted: false }, { title: 'Deleted', content: '', deleted: true }]);
    expect((await repository.findByTitleBatch(['Active', 'Deleted'])).map(row => row.title)).toEqual(['Active']);
    expect((await repository.findManyByTitles(['Active', 'Deleted'])).map(row => row.title)).toEqual(['Active']);
});
