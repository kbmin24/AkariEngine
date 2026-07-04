import { describe, expect, jest, test } from '@jest/globals'
import PageService from './PageService.js'

const createService = ({
    existingPage = null,
    latestRev = 0,
    backlinks = { count: 0, rows: [] },
} = {}) => {
    const pageRepo = {
        findByTitle: jest.fn().mockResolvedValue(existingPage),
        findBacklinksByTitle: jest.fn().mockResolvedValue(backlinks),
        upsertPage: jest.fn().mockImplementation(async (title, content, currentRev) => ({
            page: { title, content, currentRev },
            created: !existingPage,
        })),
        replaceLinksForPage: jest.fn().mockResolvedValue(undefined),
        softDeletePageWithHistory: jest.fn().mockResolvedValue({ deleted: true }),
        purgePage: jest.fn().mockResolvedValue({ purged: true }),
    }
    const historyRepo = {
        findLatestRevByPage: jest.fn().mockResolvedValue(latestRev),
        create: jest.fn().mockResolvedValue(undefined),
    }
    const categoryService = {
        extractFromContent: jest.fn().mockReturnValue([]),
        registerForPage: jest.fn().mockResolvedValue(undefined),
    }
    const permissionService = {
        requireWriteAccess: jest.fn().mockResolvedValue(undefined),
        requireLoginAccess: jest.fn().mockResolvedValue(undefined),
        requirePermission: jest.fn().mockResolvedValue(undefined),
    }

    return {
        service: new PageService(pageRepo, historyRepo, categoryService, permissionService),
        pageRepo,
        historyRepo,
        permissionService,
    }
}

describe('PageService.editPage', () => {
    test('continues revision numbers when recreating a deleted page', async () => {
        const existingPage = {
            title: 'DeletedPage',
            content: 'old deleted content\n',
            currentRev: 4,
            deleted: true,
        }
        const { service, pageRepo, historyRepo } = createService({ existingPage })

        await service.editPage({
            title: 'DeletedPage',
            content: 'recreated',
            user: 'Alice',
            ipAddress: '127.0.0.1',
            comment: 'restore page',
        })

        expect(historyRepo.findLatestRevByPage).not.toHaveBeenCalled()
        expect(pageRepo.upsertPage).toHaveBeenCalledWith(
            'DeletedPage',
            'recreated\n',
            5,
            false,
            expect.objectContaining({
                type: 'create',
                bytechange: 10,
            })
        )
        expect(historyRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            page: 'DeletedPage',
            rev: 5,
            type: 'create',
        }))
    })

    test('does not query history for normal edits', async () => {
        const existingPage = {
            title: 'ExistingPage',
            content: 'old\n',
            currentRev: 2,
        }
        const { service, pageRepo, historyRepo } = createService({ existingPage, latestRev: 99 })

        await service.editPage({
            title: 'ExistingPage',
            content: 'new',
            user: 'Alice',
            ipAddress: '127.0.0.1',
        })

        expect(historyRepo.findLatestRevByPage).not.toHaveBeenCalled()
        expect(pageRepo.upsertPage).toHaveBeenCalledWith(
            'ExistingPage',
            'new\n',
            3,
            false,
            expect.objectContaining({
                type: 'edit',
            })
        )
    })
})

describe('PageService.getXrefViewModel', () => {
    test('uses history-style pagination defaults', async () => {
        const backlinks = {
            count: 42,
            rows: Array.from({ length: 30 }, (_, index) => ({ source: `Page${index}` })),
        }
        const { service, pageRepo } = createService({ backlinks })

        const result = await service.getXrefViewModel({ title: 'Example' })

        expect(pageRepo.findBacklinksByTitle).toHaveBeenCalledWith('Example', {
            limit: 30,
            offset: 0,
        })
        expect(result).toMatchObject({
            count: 42,
            from: 1,
            to: 30,
            pgSize: 30,
        })
    })

    test('clamps requested page size to 30 backlinks', async () => {
        const backlinks = {
            count: 100,
            rows: Array.from({ length: 30 }, (_, index) => ({ source: `Page${index + 10}` })),
        }
        const { service, pageRepo } = createService({ backlinks })

        const result = await service.getXrefViewModel({ title: 'Example', from: 10, to: 100 })

        expect(pageRepo.findBacklinksByTitle).toHaveBeenCalledWith('Example', {
            limit: 30,
            offset: 9,
        })
        expect(result.from).toBe(10)
        expect(result.to).toBe(39)
    })

    test('returns empty pagination metadata when there are no backlinks', async () => {
        const { service } = createService()

        const result = await service.getXrefViewModel({ title: 'Example' })

        expect(result).toMatchObject({
            entries: [],
            count: 0,
            from: 1,
            to: 0,
            pgSize: 30,
        })
    })
})

describe('PageService.deletePage', () => {
    test('soft deletes normal pages with login access', async () => {
        const existingPage = {
            id: 7,
            title: 'ExistingPage',
            content: 'old\n',
            currentRev: 2,
            deleted: false,
        }
        const { service, pageRepo, permissionService } = createService({ existingPage })

        await service.deletePage({
            title: 'ExistingPage',
            user: 'Alice',
            ipAddress: '127.0.0.1',
            comment: 'remove from listings',
        })

        expect(permissionService.requireLoginAccess).toHaveBeenCalledWith('Alice', {
            ipAddress: '127.0.0.1',
        })
        expect(permissionService.requirePermission).not.toHaveBeenCalled()
        expect(pageRepo.softDeletePageWithHistory).toHaveBeenCalledWith({
            title: 'ExistingPage',
            doneBy: 'Alice',
            comment: 'remove from listings',
        })
    })
})

describe('PageService.purgePage', () => {
    test('purges pages with purgepage permission', async () => {
        const existingPage = {
            id: 7,
            title: 'ExistingPage',
            content: 'old\n',
            currentRev: 2,
            deleted: true,
        }
        const { service, pageRepo, permissionService } = createService({ existingPage })

        await service.purgePage({
            title: 'ExistingPage',
            user: 'Admin',
            comment: 'private information',
        })

        expect(permissionService.requirePermission).toHaveBeenCalledWith('Admin', 'purgepage')
        expect(pageRepo.purgePage).toHaveBeenCalledWith({
            title: 'ExistingPage',
            doneBy: 'Admin',
            comment: 'private information',
        })
    })
})
