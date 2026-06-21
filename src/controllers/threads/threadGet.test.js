import { describe, expect, jest, test } from '@jest/globals'
import threadGet from './threadGet.js'

describe('threadGet', () => {
    test('returns metadata and rendered comments in one response', async () => {
        const thread = { threadID: 'thread-id', pagename: 'FrontPage', isOpen: true }
        const comment = {
            id: 42,
            threadID: 'thread-id',
            type: 'comment',
            doneBy: 'Alice',
            content: "'''Hello'''",
            createdAt: new Date('2026-06-20T00:00:00.000Z'),
            isHidden: false
        }
        const services = {
            thread: {
                getThread: jest.fn().mockResolvedValue(thread),
                getThreadComments: jest.fn().mockResolvedValue([comment]),
                checkCommentPermission: jest.fn().mockResolvedValue({ hasPermission: true })
            },
            permission: {
                hasPermission: jest.fn().mockResolvedValue(true)
            },
            render: {
                render: jest.fn().mockResolvedValue({ html: '<strong>Hello</strong>' })
            }
        }
        const req = {
            params: { name: 'thread-id' },
            session: { username: 'Alice' },
            ipAddress: '127.0.0.1',
            app: { locals: { services } }
        }
        const res = { json: jest.fn() }

        await threadGet(req, res)

        expect(res.json).toHaveBeenCalledWith({
            roomId: 'thread-id',
            thread,
            pagename: 'FrontPage',
            username: 'Alice',
            isAdmin: true,
            canRead: true,
            commentPermission: { hasPermission: true },
            comments: [{
                id: 42,
                threadID: 'thread-id',
                type: 'comment',
                username: 'Alice',
                content: '<strong>Hello</strong>',
                date: comment.createdAt,
                isHidden: false
            }]
        })
    })

    test('does not mask an invalid comment result as an empty thread', async () => {
        const services = {
            thread: {
                getThread: jest.fn().mockResolvedValue({ threadID: 'thread-id', pagename: 'FrontPage' }),
                getThreadComments: jest.fn().mockResolvedValue(null),
                checkCommentPermission: jest.fn().mockResolvedValue({ hasPermission: true })
            },
            permission: {
                hasPermission: jest.fn().mockResolvedValue(false)
            },
            render: {
                render: jest.fn()
            }
        }
        const req = {
            params: { name: 'thread-id' },
            session: {},
            ipAddress: '127.0.0.1',
            app: { locals: { services } }
        }
        const res = { json: jest.fn() }

        await expect(threadGet(req, res)).rejects.toThrow()
        expect(res.json).not.toHaveBeenCalled()
    })
})
