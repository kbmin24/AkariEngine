import { updateOrphaned } from './taskScheduler.js';

test('orphan traversal follows include edges and tolerates missing include targets and sources', async () => {
    const previousDb = global.db;
    const previousOrphaned = global.orphaned;
    global.db = {
        pages: { findAll: async () => [{ title: 'FrontPage' }, { title: 'Template' }, { title: 'Orphan' }] },
        links: { findAll: async () => [
            { source: 'FrontPage', dest: 'Template', isInclude: true },
            { source: 'Template', dest: 'Missing', isInclude: true },
            { source: 'MissingSource', dest: 'Template', isInclude: true }
        ] }
    };
    try {
        await updateOrphaned();
        expect(global.orphaned).toEqual(['Orphan']);
    } finally {
        global.db = previousDb;
        global.orphaned = previousOrphaned;
    }
});
