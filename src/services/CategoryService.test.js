import { describe, expect, jest, test } from '@jest/globals'
import CategoryService from './CategoryService.js'

const createService = (result = { count: 42, rows: Array.from({ length: 30 }, (_, index) => ({ page: `Page${index}` })) }) => {
    const categoryRepo = {
        findAndCountByCategory: jest.fn().mockResolvedValue(result)
    }
    const service = new CategoryService(categoryRepo)

    return { service, categoryRepo }
}

describe('CategoryService.getCategoryViewModel', () => {
    test('uses history-style pagination defaults', async () => {
        const { service, categoryRepo } = createService()

        const result = await service.getCategoryViewModel('Example')

        expect(categoryRepo.findAndCountByCategory).toHaveBeenCalledWith('Example', {
            limit: 30,
            offset: 0
        })
        expect(result).toMatchObject({
            category: 'Example',
            from: 1,
            to: 30,
            pageCount: 42,
            pgSize: 30
        })
    })

    test('normalizes requested bounds and caps page size', async () => {
        const { service, categoryRepo } = createService({
            count: 42,
            rows: Array.from({ length: 30 }, (_, index) => ({ page: `Page${index + 10}` }))
        })

        const result = await service.getCategoryViewModel('Example', { from: 10, to: 100 })

        expect(categoryRepo.findAndCountByCategory).toHaveBeenCalledWith('Example', {
            limit: 30,
            offset: 9
        })
        expect(result.from).toBe(10)
        expect(result.to).toBe(39)
    })

    test('returns zero end bound for empty categories', async () => {
        const { service } = createService({ count: 0, rows: [] })

        const result = await service.getCategoryViewModel('Empty')

        expect(result).toMatchObject({
            category: 'Empty',
            from: 1,
            to: 0,
            pageCount: 0,
            pgSize: 30
        })
    })
})
