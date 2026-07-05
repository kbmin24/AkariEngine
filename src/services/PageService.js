import logger from '../utils/logger.js'
import { PROTECTION_TASKS } from '../utils/acl.js'
import mergeDiff from '../utils/mergeDiff.js'

import {
    PageNotFoundError,
    RevisionNotFoundError,
    PageExistsError,
    ValidationError,
    AuthenticationRequiredError,
    EditConflictError
} from './errors.js'

class PageService {
    constructor(pageRepo, historyRepo, categoryService, permissionService, protectRepo = null, recentChangeRepo = null, msRepo = null) {
        this.pageRepo = pageRepo
        this.historyRepo = historyRepo
        this.categoryService = categoryService
        this.permissionService = permissionService
        this.protectRepo = protectRepo
        this.recentChangeRepo = recentChangeRepo
        this.msRepo = msRepo
    }

    /**
     * Fetches page model. Checks read permission, and if rev is provided, checks read access for the specific revision.
     * @param {String} title 
     * @param {Object} options
     * @param {String} [options.rev] - Revision number to fetch. If not provided, fetches current revision.
     * @param {String} [options.user] - Username of the user making the request. Required for logged in users.
     * @param {String} options.ipAddress - IP address of the user making the request. Required.
     * @returns {Promise<Object>} Sequelize model for page, with { title, content, currentRev, deleted }.
     * @throws {ValidationError} if title is not provided or is invalid, if revision is invalid (and is provided), or if options.ipAddress is not provided.
     * @throws {PageNotFoundError} If the page (or the revision, if provided) is not found or is deleted. This error is not thrown when a revision for a deleted page is requested.
     * @throws {PermissionDeniedError} If the user/ip does not have sufficient READ permission.
     */
    async getPage(title, options = {}) {
        const { rev, user, ipAddress } = options
        if (rev) {
            if (!Number.isInteger(rev)) throw new ValidationError('Illlegal revision')
        }
        if (ipAddress === undefined) {
            throw new ValidationError('ip Address is required')
        }
        await this.permissionService.requireReadAccess(user, title, {
            revision: rev,
            ipAddress
        })

        let page

        page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)
        if (rev) {
            page = await this.historyRepo.findByPageAndRev(title, rev)
            if (!page) throw new RevisionNotFoundError(title, rev)
            return {
                title: page.page,
                content: page.content,
                currentRev: page.rev,
                fromHistory: true
            }
        }
        if (page.deleted) throw new PageNotFoundError(title)
        return page
    }

    splitEditSection(content, section) {
        let prefix = ''
        let suffix = ''
        let body = content

        if (!section || Number.isNaN(Number(section)) || Number(section) <= 0) {
            return { prefix, suffix, content: body }
        }

        const sectionIndex = Number(section)
        const headLookupRegex = /(?=^(={1,6})(?!=) (?:.*?) \1[ \t]*$)/gim

        // len=2*(number of sections) + (1 if the content does NOT start with a heading)
        const splits = body.split(headLookupRegex)

        let offset = 0
        if (/^(={1,6})(?!=) (.*?) \1[ \t]*$/igm.test(splits[0])) offset = -2

        // loc in splits array
        const targetIndex = 2 * sectionIndex + offset
        if (targetIndex >= splits.length) {
            throw new ValidationError({
                i18nKey: 'edit_noparagraph',
                statusCode: 200,
                code: 'EDIT_NO_PARAGRAPH'
            })
        }

        // targetIndex-1 is the heading, targetIndex+1 is the next heading
        for (let i = 0; i < targetIndex - 1; i += 2) prefix += splits[i]
        for (let i = targetIndex + 2; i < splits.length; i += 2) suffix += splits[i]
        body = splits[targetIndex]

        return { prefix, suffix, content: body }
    }

    /**
     * must be called after requirePageAccess with `store` mode which populates req.(key)
     */
    async getEditViewModel({ title, section, aclState, username }) {
        title = title.trim()

        const page = await this.pageRepo.findByTitle(title)
        if (page && page.deleted) throw new PageNotFoundError(title)
        if (!page && title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'pagename_illegalfile',
                statusCode: 200,
                code: 'ILLEGAL_FILE_TITLE'
            })
        }

        const actionAllowed = aclState ? aclState.allowed : true
        const notification = (!actionAllowed && aclState && aclState.error)
            ? {
                i18nKey: aclState.error.i18nKey || null,
                i18nParams: aclState.error.i18nParams || {},
                message: aclState.error.message
            }
            : undefined

        const rawContent = page ? page.content : ''
        const sectionResult = actionAllowed
            ? this.splitEditSection(rawContent, section)
            : { prefix: '', suffix: '', content: rawContent }

        return {
            title,
            baseRev: page ? page.currentRev : 0,
            username,
            content: sectionResult.content,
            prefix: sectionResult.prefix,
            suffix: sectionResult.suffix,
            disabled: actionAllowed !== true,
            needsCaptcha: actionAllowed === true,
            notification
        }
    }

    async getRawContent({ title, rev, user, ipAddress }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'RAW_TITLE_NEEDED'
            })
        }

        await this.permissionService.requireReadAccess(user, title, {
            ipAddress,
            revision: rev
        })

        const page = rev === undefined
            ? await this.pageRepo.findByTitle(title)
            : await this.historyRepo.findByPageAndRev(title, rev)

        if (!page) throw new PageNotFoundError(title)
        if (rev === undefined && page.deleted) throw new PageNotFoundError(title)
        return page.content
    }

    async getXrefViewModel({ title, from, to }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'XREF_TITLE_NEEDED'
            })
        }

        const page = await this.pageRepo.findByTitle(title)
        if (page && page.deleted) throw new PageNotFoundError(title)

        const pgSize = 30
        let normalizedFrom = Number(from)
        let normalizedTo = Number(to)

        if (!Number.isInteger(normalizedFrom) || normalizedFrom < 1) normalizedFrom = 1
        if (!Number.isInteger(normalizedTo) || normalizedTo < normalizedFrom) normalizedTo = normalizedFrom + pgSize - 1

        const requestedSize = normalizedTo - normalizedFrom + 1
        const limit = Math.min(requestedSize, pgSize)
        const offset = normalizedFrom - 1

        const backlinks = await this.pageRepo.findBacklinksByTitle(title, { limit, offset })
        normalizedTo = normalizedFrom + backlinks.rows.length - 1
        if (normalizedTo > backlinks.count) normalizedTo = backlinks.count
        if (backlinks.count === 0) normalizedTo = 0

        return {
            title,
            entries: backlinks.rows,
            count: backlinks.count,
            from: normalizedFrom,
            to: normalizedTo,
            pgSize
        }
    }

    async getMoveViewModel({ title, username }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 200,
                code: 'MOVE_TITLE_NEEDED'
            })
        }

        if (title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'move_nofile',
                statusCode: 200,
                code: 'MOVE_NO_FILE'
            })
        }

        const page = await this.pageRepo.findByTitle(title)
        if (!page || page.deleted) throw new PageNotFoundError(title)

        return {
            originalName: title,
            username
        }
    }

    async getDeleteViewModel({ title, username }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 200,
                code: 'DELETE_TITLE_NEEDED'
            })
        }

        if (title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'delete_nofile',
                message: "File pages can only be purged."
            })
        }

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)
        if (page.deleted) throw new PageNotFoundError(title)

        return {
            title,
            username,
            pagename: page.title
        }
    }

    async getPurgeViewModel({ title, username }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 200,
                code: 'PURGE_TITLE_NEEDED'
            })
        }

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)

        return {
            title,
            username,
            pagename: page.title
        }
    }

    async getPageListViewModel({ page = 1 } = {}) {
        const pageSize = 50
        const offset = (page - 1) * pageSize
        const result = await this.pageRepo.findAllPaginatedLight(offset, pageSize)
        return {
            pages: result.rows,
            count: result.count,
            currentPage: page
        }
    }

    /**
     * Retrieves a list of orphaned pages. Returns 30 pages at a time, starting from the specified index.
     * @param {number} from - The starting index for the list of orphaned pages.
     * @returns {Promise<Array>} A promise resolving to an array of orphaned pages.
     */
    async getOrphanedPagesAndCount(from = 0) {
        const pages = (global.orphaned || []).slice(from, from + 30)
        const count = global.orphaned ? global.orphaned.length : 0
        return { pages, count }
    }

    async buildNormalizedEditContent({ content, editPrefix = '', editSuffix = '' }) {
        const rawBody = content.endsWith('\n') ? content : `${content}\n`
        const merged = `${editPrefix}${rawBody}${editSuffix}`.replace(/\r/g, '')
        return merged
    }

    async editPage({ title, content, baseRev, user, comment, editPrefix = '', editSuffix = '', ipAddress, iscreatingFile = false }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'edit_titleneeded',
                statusCode: 200,
                code: 'EDIT_TITLE_NEEDED'
            })
        }
        if (!content && content !== '') {
            throw new ValidationError({
                i18nKey: 'edit_contentneeded',
                statusCode: 200,
                code: 'EDIT_CONTENT_NEEDED'
            })
        }

        let normalizedContent = await this.buildNormalizedEditContent({ content, editPrefix, editSuffix })
        const normalizedBaseRev = baseRev === undefined || baseRev === null || baseRev === ''
            ? undefined
            : Number(baseRev)

        if (normalizedBaseRev !== undefined && (!Number.isInteger(normalizedBaseRev) || normalizedBaseRev < 0)) {
            throw new ValidationError({
                message: 'Invalid base revision',
                code: 'EDIT_INVALID_BASE_REV'
            })
        }

        const existingPage = await this.pageRepo.findByTitle(title)

        if (!existingPage && title.toLowerCase().startsWith('file:') && !iscreatingFile) {
            throw new ValidationError({
                i18nKey: 'pagename_illegalfile',
                statusCode: 200,
                code: 'ILLEGAL_FILE_TITLE'
            })
        }

        await this.permissionService.requireWriteAccess(user, title, { ipAddress })

        // edit conflict
        if (existingPage && !existingPage.deleted && normalizedBaseRev !== undefined && existingPage.currentRev !== normalizedBaseRev) {
            // attempt automerge
            const baseContent = await this.getRawContent({ title, rev: normalizedBaseRev, user, ipAddress })
            const existingContent = existingPage.content
            const mergeResult = mergeDiff(baseContent, existingContent, normalizedContent)
            if (mergeResult.success) {
                normalizedContent = mergeResult.merged
                comment = comment ? `(auto-merged with r${existingPage.currentRev}) ${comment}` : `(auto-merged with r${existingPage.currentRev})`
            }
            else {
                throw new EditConflictError(mergeResult.conflicts, {
                    baseRev: normalizedBaseRev,
                    conflictRev: existingPage.currentRev,
                    merged: mergeResult.merged,
                    chunks: mergeResult.chunks
                })
            }
        }

        const doneBy = user || ipAddress
        const isNewPage = !existingPage || existingPage.deleted
        const oldContent = !existingPage || existingPage.deleted ? '' : existingPage.content
        const byteChange = normalizedContent.length - oldContent.length
        const latestRev = existingPage
            ? existingPage.currentRev
            : await this.historyRepo.findLatestRevByPage(title)
        const nextRev = (latestRev || 0) + 1

        const { page } = await this.pageRepo.upsertPage(title, normalizedContent, nextRev, false, {
            doneBy,
            bytechange: isNewPage ? normalizedContent.length : byteChange,
            comment,
            type: isNewPage ? 'create' : 'edit'
        })

        const categories = this.categoryService.extractFromContent(normalizedContent)
        await this.categoryService.registerForPage(title, categories)
        await this.pageRepo.replaceLinksForPage(title, normalizedContent)

        await this.historyRepo.create({
            page: title,
            rev: nextRev,
            content: normalizedContent,
            bytechange: isNewPage ? normalizedContent.length : byteChange,
            editedby: doneBy,
            comment: comment || '',
            type: isNewPage ? 'create' : 'edit'
        })

        if (this.msRepo) {
            try {
                await this.msRepo.addDocuments(page)
            } catch (e) {
                logger.warn('Meilisearch index update failed after edit', { title, error: e.message })
            }
        }

        logger.info('Page edited', { title, user: doneBy, rev: nextRev })
        return page
    }

    async deletePage({ title, user, ipAddress, comment }) {
        if (!title) throw new ValidationError('Page title is required')
        if (title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'delete_nofile',
                message: "File pages can only be purged."
            })
        }

        await this.permissionService.requireLoginAccess(user, { ipAddress })
        const page = await this.pageRepo.findByTitle(title)
        if (!page || page.deleted) throw new PageNotFoundError(title)

        await this.pageRepo.softDeletePageWithHistory({
            title,
            doneBy: user,
            comment
        })

        if (this.msRepo) {
            try {
                await this.msRepo.deleteDocument(page.id)
            } catch (e) {
                logger.warn('Meilisearch index update failed after delete', { title, error: e.message })
            }
        }

        logger.admin('Page deleted', user, { title })
        return true
    }

    async purgePage({ title, user, comment }) {
        if (!title) throw new ValidationError('Page title is required')
        if (!user) throw new AuthenticationRequiredError()

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)
        await this.permissionService.requirePermission(user, 'purgepage')

        const result = await this.pageRepo.purgePage({
            title,
            doneBy: user,
            comment
        })

        if (!result.purged && result.reason === 'not_found') {
            throw new PageNotFoundError(title)
        }

        if (this.msRepo) {
            try {
                await this.msRepo.deleteDocument(page.id)
            } catch (e) {
                logger.warn('Meilisearch index update failed after purge', { title, error: e.message })
            }
        }

        logger.admin('Page purged', user, { title })
        return result
    }

    async movePage(oldTitle, newTitle, user) {
        const options = typeof oldTitle === 'object'
            ? oldTitle
            : { oldTitle, newTitle, user }

        const sourceTitle = options.oldTitle
        const targetTitle = options.newTitle
        const actor = options.user
        const ipAddress = options.ipAddress

        await this.permissionService.requireMoveAccess(actor, sourceTitle, { ipAddress })

        if (!sourceTitle || !targetTitle || targetTitle.length > 255) {
            throw new ValidationError('Invalid new title')
        }

        const sourcePage = await this.pageRepo.findByTitle(sourceTitle)
        if (!sourcePage || sourcePage.deleted) throw new PageNotFoundError(sourceTitle)

        const categories = this.categoryService.extractFromContent(sourcePage.content || '')
        const doneBy = actor || ipAddress
        const result = await this.pageRepo.movePageWithRedirect({
            oldTitle: sourceTitle,
            newTitle: targetTitle,
            doneBy,
            categories
        })

        if (!result.moved && result.reason === 'target_exists') {
            throw new PageExistsError(targetTitle)
        }
        if (!result.moved && result.reason === 'not_found') {
            throw new PageNotFoundError(sourceTitle)
        }

        if (this.msRepo) {
            try {
                const [movedPage, redirectPage] = await Promise.all([
                    this.pageRepo.findByTitle(targetTitle),
                    this.pageRepo.findByTitle(sourceTitle)
                ])
                const toIndex = [movedPage, redirectPage].filter(Boolean)
                if (toIndex.length > 0) await this.msRepo.addDocuments(toIndex)
            } catch (e) {
                logger.warn('Meilisearch index update failed after move', { from: sourceTitle, to: targetTitle, error: e.message })
            }
        }

        logger.admin('Page moved', doneBy, { from: sourceTitle, to: targetTitle })
        return { oldTitle: sourceTitle, newTitle: targetTitle }
    }

    async protectPage({ title, rules, user }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'PROTECT_TITLE_NEEDED'
            })
        }

        await this.permissionService.requirePermission(user, 'acl')

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)

        const allowedTasks = new Set(PROTECTION_TASKS)
        const normalizedRules = Object.fromEntries(
            Object.entries(rules || {}).filter(([task]) => allowedTasks.has(task))
        )

        if (!this.protectRepo || !this.recentChangeRepo) {
            throw new Error('Protect/RecentChange repositories are required for protectPage')
        }

        await this.protectRepo.replacePageProtections(title, normalizedRules)

        const nextRev = (page.currentRev || 0) + 1

        const comment = Object.entries(normalizedRules)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        await this.historyRepo.create({
            page: title,
            rev: nextRev,
            content: page.content,
            bytechange: 0,
            editedby: user,
            type: 'protect',
            comment
        })

        await page.update({ currentRev: nextRev })

        await this.recentChangeRepo.create({
            page: title,
            rev: nextRev,
            bytechange: 0,
            doneBy: user,
            type: 'protect',
            comment
        })

        return { title }
    }

}

export default PageService;
