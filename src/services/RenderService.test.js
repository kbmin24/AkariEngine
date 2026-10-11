import sanitizeHtml from 'sanitize-html'
import { jest } from '@jest/globals'

import config from '../config/index.js'
import RenderService from './RenderService.js'

const renderFunction = key => key

function createService() {
    const pageRepository = {
        count: jest.fn(async () => 0),
        findByTitleBatch: jest.fn(async titles =>
            titles.includes('Internal') ? [{ title: 'Internal' }] : []
        )
    }
    const fileRepository = {
        findByFilenameBatch: jest.fn(async () => [])
    }

    return new RenderService(pageRepository, fileRepository)
}

describe('RenderService link metadata', () => {
    beforeEach(() => {
        global.hooks = {
            beginRender: [],
            endRender: []
        }
        global.sanitiseOptions = config.sanitiseOptions
    })

    test('marks rendered external wiki links as external', async () => {
        const result = await createService().render(
            '[[https://example.com/path|Example]]',
            renderFunction,
            {},
            false
        )

        expect(result.result).toBe('ok')
        expect(result.html).toContain('href="https://example.com/path"')
        expect(result.html).toContain('data-is-external="true"')
    })

    test('does not mark rendered internal wiki links as external', async () => {
        const result = await createService().render(
            '[[Internal]]',
            renderFunction,
            {},
            false
        )

        expect(result.result).toBe('ok')
        expect(result.html).toContain('href="/w/Internal"')
        expect(result.html).not.toContain('data-is-external')
    })

    test('normalises external marker during sanitisation', () => {
        const internal = sanitizeHtml(
            '<a href="/w/Internal" data-is-external="true">Internal</a>',
            config.sanitiseOptions
        )
        const external = sanitizeHtml(
            '<a href="https://example.com">External</a>',
            config.sanitiseOptions
        )

        expect(internal).not.toContain('data-is-external')
        expect(external).toContain('data-is-external="true"')
    })

    test.each([
        '[InClUdE(Template:공무원헤드라인)]',
        '[include]{{\nTemplate:공무원헤드라인\n}}',
        '[INCLUDE]{{\r\n Template:공무원헤드라인 ,name=Alice,ignored\r\n}}',
        '[include(Template:공무원헤드라인,name=Alice,ignored)]'
    ])('include rendering resolves the first title field: %s', async (content) => {
        const service = createService()
        service.pageRepository.findManyByTitles = jest.fn(async () => [
            { title: 'Template:공무원헤드라인', content: 'Included content' }
        ])
        const result = await service.render(content, renderFunction, {}, false)
        expect(result.html).toContain('Included content')
        expect(service.pageRepository.findManyByTitles).toHaveBeenCalledWith(['Template:공무원헤드라인'])
    })
})
