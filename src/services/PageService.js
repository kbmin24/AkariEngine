const paths = require('../utils/paths')
const fs = require('fs')
const logger = require(paths.utils('logger'))
const {
    PageNotFoundError,
    PageExistsError,
    RevisionNotFoundError,
    ValidationError,
    AuthenticationRequiredError
} = require('./errors')

class PageService {
    constructor(pageRepo, historyRepo, categoryService, permissionService) {
        this.pageRepo = pageRepo
        this.historyRepo = historyRepo
        this.categoryService = categoryService
        this.permissionService = permissionService
    }

    async getPage(title, options = {}) {
        const { rev, user } = options
        await this.permissionService.requireReadAccess(user, title)

        let page = null
        if (rev) {
            page = await this.historyRepo.findByPageAndRev(title, rev)
            if (!page) throw new PageNotFoundError(title)
            return {
                title: page.page,
                content: page.content,
                currentRev: page.rev,
                fromHistory: true
            }
        }

        page = await this.pageRepo.findByTitle(title)
        if (!page || page.deleted) throw new PageNotFoundError(title)
        return page
    }

    async editPage({ title, content, user, comment }) {
        if (!title || title.length > 255) throw new ValidationError('Invalid page title')
        if (!content && content !== '') throw new ValidationError('Content is required')

        await this.permissionService.requireWriteAccess(user, title)

        const existingPage = await this.pageRepo.findByTitle(title)
        const isNewPage = !existingPage
        const oldContent = existingPage ? existingPage.content : ''
        const byteChange = content.length - oldContent.length
        const nextRev = (existingPage ? existingPage.currentRev : 0) + 1

        const { page } = await this.pageRepo.upsertPage(title, content, nextRev, false)

        const categories = this.categoryService.extractFromContent(content)
        await this.categoryService.registerForPage(title, categories)

        await this.historyRepo.create({
            page: title,
            rev: nextRev,
            content,
            bytechange: byteChange,
            editedby: user,
            comment: comment || '',
            type: isNewPage ? 'create' : 'edit'
        })

        logger.info('Page edited', { title, user, rev: nextRev })
        return page
    }

    async deletePage(arg1, arg2) {
        const options = typeof arg1 === 'string'
            ? { title: arg1, user: arg2 }
            : (arg1 || {})

        const title = options.title
        const user = options.user
        const ipAddress = options.ipAddress
        const comment = options.comment || ''

        if (!title) throw new ValidationError('Page title is required')

        if (!user) throw new AuthenticationRequiredError()

        const isFile = title.toLowerCase().startsWith('file:')
        if (isFile) {
            await this.permissionService.requirePermission(user, 'deletefile')
        }
        await this.permissionService.requirePermission(user, 'deletepage')

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)

        let filename = ''
        if (isFile) {
            const m = /^File:(.*)$/i.exec(title)
            filename = m && m[1] ? m[1] : ''
            if (!filename) throw new ValidationError('Unknown Error')

            const uploadPath = paths.resolve('public', 'uploads', filename)
            if (fs.existsSync(uploadPath)) {
                fs.unlinkSync(uploadPath)
            }
        }

        const doneBy = user || ipAddress
        await this.pageRepo.deletePageWithHistory({
            title,
            doneBy,
            comment,
            isFile,
            filename
        })

        logger.admin('Page deleted', doneBy, { title, isFile })
        return true
    }

    async movePage(oldTitle, newTitle, user) {
        const options = typeof oldTitle === 'object'
            ? oldTitle
            : { oldTitle, newTitle, user }

        const sourceTitle = options.oldTitle
        const targetTitle = options.newTitle
        const actor = options.user
        const ipAddress = options.ipAddress

        if (!sourceTitle || !targetTitle || targetTitle.length > 255) {
            throw new ValidationError('Invalid new title')
        }

        const sourcePage = await this.pageRepo.findByTitle(sourceTitle)
        if (!sourcePage) throw new PageNotFoundError(sourceTitle)

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

        logger.admin('Page moved', doneBy, { from: sourceTitle, to: targetTitle })
        return { oldTitle: sourceTitle, newTitle: targetTitle }
    }

    async revertPage({ title, revertRev, user, ipAddress, comment = '' }) {
        if (!title) throw new ValidationError('Page title is required')
        if (revertRev === undefined || revertRev === null || Number.isNaN(Number(revertRev))) {
            throw new ValidationError('Revision is required')
        }

        const doneBy = user || ipAddress
        const mergedComment = `Revert to r${revertRev} - ${comment || ''}`
        const result = await this.pageRepo.revertPageToRevision({
            title,
            revertRev,
            comment: mergedComment,
            doneBy
        })

        if (!result.reverted && result.reason === 'not_found') {
            throw new PageNotFoundError(title)
        }
        if (!result.reverted && result.reason === 'revision_not_found') {
            throw new RevisionNotFoundError(title, revertRev)
        }

        logger.info('Page reverted', { title, revertRev, doneBy })
        return result
    }

    async searchPages(query, limit = 10) {
        return this.pageRepo.searchByTitle(query, limit)
    }
}

module.exports = PageService
