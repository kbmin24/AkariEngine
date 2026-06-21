import { ValidationError, PermissionDeniedError } from './errors.js'
import genArbitraryString from '../utils/genArbitraryString.js'
import sanitizeHtml from 'sanitize-html'

class ThreadService {
    constructor(threadRepo, threadCommentRepo, pagesRepo, recentDiscussrepo, permissionService) {
        this.threadRepo = threadRepo
        this.threadCommentRepo = threadCommentRepo
        this.pagesRepo = pagesRepo
        this.recentDiscussrepo = recentDiscussrepo
        this.permissionService = permissionService
    }

    async getThread(threadID) {
        if (!threadID || typeof threadID !== 'string') return null
        const normalized = threadID.trim()
        if (!normalized) return null
        return this.threadRepo.findByThreadId(normalized)
    }

    /**
     * get a list of models of open threads associated with a page name.
     * @param {String} query - Page name to look for.
     * @param {String} username - The username of the user making the request.
     * @param {String} ipAddress - The IP address of the user making the request.
     * @returns {Promise<Array|null>} A list of open threads associated with the given page name, or null if the query is invalid.
     */
    async getOpenThreadsByPageName(query, username, ipAddress) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        await this.permissionService.requireReadAccess(username, normalized, { ipAddress })

        return this.threadRepo.findOpenByPageName(normalized)
    }

    /**
     * get a list of models of closed threads associated with a page name.
     * @param {String} query - Page name to look for.
     * @return {Promise<Array|null>} A list of closed threads associated with the given page name, or null if the query is invalid.
     */
    async getClosedThreadsByPageName(username, ipAddress, query) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        await this.permissionService.requireReadAccess(username, normalized, { ipAddress })

        return this.threadRepo.findClosedByPageName(normalized)
    }

    /**
     * Get information about a thread.
     * @param {String} query - The thread ID to look for.
     * @param {Object} [context={}] - The context of the request.
     * @param {String} [context.user] - The username of the user making the request.
     * @param {String} [context.ipAddress] - The IP address of the user making the request.
     * @returns {Promise<Object|null>} Information about the thread, or null if the query is invalid.
     */
    async getThreadInfo(query, context = {}) {
        if (!query || typeof query !== 'string') return null

        const normalized = query.trim()
        if (!normalized) return null

        let thread = await this.threadRepo.findByThreadId(query.trim())
        let pagename = thread ? thread.pagename : null
        if (!pagename) return null

        let allowed = true
        try {
            await this.permissionService.requireReadAccess(context.user, pagename, { ipAddress: context.ipAddress })
        } catch {
            allowed = false
        }

        return {
            isOpen: thread.isOpen,
            r: allowed
        }
    }

    // add JSDoc comments for the following methods
    /**
     * Change the status of a thread.
     * @param {Object} param0 - The parameters for changing the thread status.
     * @param {String} param0.threadID - The ID of the thread to change.
     * @param {Boolean} param0.close - Whether to close the thread.
     * @param {String} param0.user - The username of the user making the request.
     */
    async changeThreadStatus({ threadID, close, user }) {
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

    /**
     * Change the title of a thread.
     * @param {Object} param0 - The parameters for changing the thread title.
     * @param {String} param0.threadID - The ID of the thread to change.
     * @param {String} param0.newTitle - The new title for the thread.
     * @param {String} param0.user - The username of the user making the request.
     */
    async changeThreadTitle({ threadID, newTitle, user }) {
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

    /**
     * Hide or unhide a comment in a thread.
     * @param {Object} param0 - The parameters for hiding/unhiding the comment.
     * @param {String} param0.threadID - The ID of the thread containing the comment.
     * @param {Number} param0.threadNo - The offset of the comment in the thread.
     * @param {Boolean} param0.unhide - Whether to unhide the comment.
     * @param {String} param0.user - The username of the user making the request.
     */
    async hideThreadComment({ threadID, threadNo, unhide, user }) {
        await this.permissionService.requirePermission(user, 'thread')

        const comment = await this.threadCommentRepo.findByThreadIdAtOffset(threadID, threadNo - 1)
        if (!comment) throw new ValidationError('No such comment.')

        await comment.update({ isHidden: !unhide })
    }

    /**
     * Get a list of comments associated with a thread ID.
     * @param {String} username - The username of the user making the request.
     * @param {String} ipAddress - The IP address of the user making the request.
     * @param {String} query - The thread ID to look for.
     * @returns {Promise<Array|null>} A list of comments associated with the given thread ID, or null if the query is invalid.
     */
    async getThreadComments(username, ipAddress, query) {
        if (!query || typeof query !== 'string') return null

        let thread = await this.threadRepo.findByThreadId(query.trim())
        let pagename = thread ? thread.pagename : null
        if (!pagename) return null

        await this.permissionService.requireReadAccess(username, pagename, { ipAddress })

        const normalized = query.trim()
        if (!normalized) return null

        return this.threadCommentRepo.findByThreadIdOrdered(normalized)
    }

    /** 
     * Create a new thread
     * @param {String} username - The username of the user creating the thread. undefined for IP user.
     * @param {String} ipAddress - The IP address of the user creating the thread.
     * @param {String} title - The title of the thread.
     * @param {String} pageName - The name of the page the thread is associated with.
     * @param {String} comment - The content of the initial comment in the thread.
     * @returns {Promise<String>} The ID of the newly created thread.
    */
    async postComment({ threadID, username, ipAddress, message }) {
        if (!message || typeof message !== 'string' || !message.trim()) {
            throw new ValidationError('Message is required.')
        }
        if (message.length > 10000) {
            throw new ValidationError('Message is too long.')
        }

        const thread = await this.threadRepo.findByThreadId(threadID)
        if (!thread) throw new ValidationError('Thread not found.')
        if (!thread.isOpen) throw new ValidationError('Thread is closed.')

        await this.permissionService.requireReadAccess(username, thread.pagename, { ipAddress })
        await this.permissionService.requireEveryoneAccess(username, { ipAddress })

        const doneBy = username || ipAddress
        const comment = await this.threadCommentRepo.createNewComment(threadID, doneBy, message)

        await this.recentDiscussrepo.destroyByThreadId(threadID)
        await this.recentDiscussrepo.createNewEntry(thread.threadTitle, threadID, thread.pagename)

        return { thread, comment }
    }

    async createThread(username, ipAddress, title, pageName, comment) {
        await this.permissionService.requireReadAccess(username, pageName, { ipAddress })
        if (!(await this.pagesRepo.findByTitle(pageName))) {
            throw new ValidationError({
                message: 'No such page.',
                i18nKey: 'page404'
            })
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new ValidationError({
                message: 'Title is required.',
                i18nKey: 'titleRequired'
            })
        }

        // add fallback comment
        if (!comment || typeof comment !== 'string' || !comment.trim()) {
            comment = "''No Description Given.''"
        }

        let threadID = ''
        while (threadID === '') {
            let newID = genArbitraryString(11) //somehow youtube uses 11 as well
            if (!(await this.threadRepo.findByThreadId(newID))) threadID = newID
        }

        pageName = sanitizeHtml(pageName, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'escape' })

        await this.threadRepo.createNewThread(pageName, threadID, title)
        await this.threadCommentRepo.createNewComment(threadID, username || ipAddress, comment)
        await this.recentDiscussrepo.createNewEntry(title, threadID, pageName)

        return threadID
    }

    /**
     * Checks whether a user has permission to comment on a thread.
     * Requires Everyone ACL level + READ permission on the page the thread is associated with.
     * @param {String} username
     * @param {String} ipAddress
     * @param {String} threadID
     * @returns {Promise<{hasPermission: boolean, i18nKey?: string, i18nParams?: Object, reason?: string}|void>} If the user does not have permission, returns { hasPermission: false }. Otherwise, returns nothing.
     */
    async checkCommentPermission(username, ipAddress, threadID) {
        const thread = await this.threadRepo.findByThreadId(threadID)
        if (!thread) throw new ValidationError('Thread not found.')
        try {
            await this.permissionService.requireReadAccess(username, thread.pagename, { ipAddress })
            await this.permissionService.requireEveryoneAccess(username, { ipAddress })
        } catch (e) {
            if (e instanceof PermissionDeniedError) {
                return {
                    hasPermission: false,
                    i18nKey: e.i18nKey,
                    i18nParams: e.i18nParams,
                    reason: e.message
                }
            } else {
                throw e
            }
        }

        return { hasPermission: true }
    }
}

export default ThreadService
