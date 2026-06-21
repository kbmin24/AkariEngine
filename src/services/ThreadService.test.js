import { describe, expect, jest, test } from '@jest/globals'
import ThreadService from './ThreadService.js'

const createService = () => {
    const persistedComment = {
        id: 42,
        threadID: 'thread-id',
        type: 'comment',
        doneBy: 'Alice',
        content: 'Hello',
        createdAt: new Date('2026-06-20T00:00:00.000Z'),
        isHidden: false
    }
    const thread = { threadID: 'thread-id', pagename: 'FrontPage', threadTitle: 'Topic', isOpen: true }
    const threadRepo = {
        findByThreadId: jest.fn().mockResolvedValue(thread)
    }
    const threadCommentRepo = {
        createNewComment: jest.fn().mockResolvedValue(persistedComment)
    }
    const recentDiscussRepo = {
        destroyByThreadId: jest.fn().mockResolvedValue(undefined),
        createNewEntry: jest.fn().mockResolvedValue(undefined)
    }
    const permissionService = {
        requireReadAccess: jest.fn().mockResolvedValue(undefined),
        requireEveryoneAccess: jest.fn().mockResolvedValue(undefined)
    }
    const service = new ThreadService(
        threadRepo,
        threadCommentRepo,
        {},
        recentDiscussRepo,
        permissionService
    )

    return { service, persistedComment, permissionService, recentDiscussRepo }
}

describe('ThreadService.postComment', () => {
    test('returns the persisted comment as the authoritative socket payload source', async () => {
        const { service, persistedComment, permissionService, recentDiscussRepo } = createService()

        const result = await service.postComment({
            threadID: 'thread-id',
            username: 'Alice',
            ipAddress: '127.0.0.1',
            message: 'Hello'
        })

        expect(result.comment).toBe(persistedComment)
        expect(permissionService.requireReadAccess).toHaveBeenCalledWith(
            'Alice',
            'FrontPage',
            { ipAddress: '127.0.0.1' }
        )
        expect(permissionService.requireEveryoneAccess).toHaveBeenCalledWith(
            'Alice',
            { ipAddress: '127.0.0.1' }
        )
        expect(recentDiscussRepo.createNewEntry).toHaveBeenCalledWith('Topic', 'thread-id', 'FrontPage')
    })
})
