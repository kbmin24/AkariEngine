import { ValidationError } from './errors.js'

class ThreadService {
    constructor(threadRepo, threadCommentRepo, permissionService) {
        this.threadRepo = threadRepo
        this.threadCommentRepo = threadCommentRepo
        this.permissionService = permissionService
    }

    async getOpenThreadsByPageName(query) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        return this.threadRepo.findOpenByPageName(normalized)
    }

    async getThreadInfo(query, context = {}) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        const thread = await this.threadRepo.findByThreadId(normalized)
        if (!thread) return null

        const access = await this.permissionService.checkAccessDetailed(
            context.user,
            null,
            'read',
            {
                ipAddress: context.ipAddress,
                requiredLevel: 'everyone'
            }
        )

        return {
            isOpen: thread.isOpen,
            r: access.allowed ? true : (access.message || false)
        }
    }

    async changeThreadStatus({ threadID, close, user, ipAddress }) {
        await this.permissionService.requirePermission(user, 'thread')

        const thread = await this.threadRepo.findByThreadId(threadID)
        if (!thread) throw new ValidationError('No such thread.')

        await thread.update({ isOpen: !close })
        await this.threadCommentRepo.create({
            type: close ? 'close' : 'open',
            threadID,
            doneBy: user,
            content: '',
            isHidden: false
        })
    }

    async changeThreadTitle({ threadID, newTitle, user, ipAddress }) {
        await this.permissionService.requirePermission(user, 'thread')

        const thread = await this.threadRepo.findByThreadId(threadID)
        if (!thread) throw new ValidationError('No such thread.')

        await thread.update({ threadTitle: newTitle })
        await this.threadCommentRepo.create({
            type: 'changetitle',
            threadID,
            doneBy: user,
            content: newTitle,
            isHidden: false
        })
    }

    async hideThreadComment({ threadID, threadNo, unhide, user, ipAddress }) {
        await this.permissionService.requirePermission(user, 'thread')

        const comment = await this.threadCommentRepo.findByThreadIdAtOffset(threadID, threadNo - 1)
        if (!comment) throw new ValidationError('No such comment.')

        await comment.update({ isHidden: !unhide })
    }

    async getThreadComments(query) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        return this.threadCommentRepo.findByThreadIdOrdered(normalized)
    }
}

export default ThreadService
