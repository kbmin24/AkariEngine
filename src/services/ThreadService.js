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

    async getThreadComments(query) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        return this.threadCommentRepo.findByThreadIdOrdered(normalized)
    }
}

module.exports = ThreadService
