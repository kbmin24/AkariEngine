const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const {
    PageNotFoundError,
    PageExistsError,
    ValidationError
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
            comment: comment || (isNewPage ? 'Page created' : 'Page edited'),
            type: isNewPage ? 'create' : 'edit'
        })

        logger.info('Page edited', { title, user, rev: nextRev })
        return page
    }

    async deletePage(title, user) {
        await this.permissionService.requirePermission(user, 'deletepage')

        const page = await this.pageRepo.findByTitle(title)
        if (!page || page.deleted) throw new PageNotFoundError(title)

        await this.pageRepo.markDeleted(title)
        logger.admin('Page deleted', user, { title })
        return true
    }

    async movePage(oldTitle, newTitle, user) {
        if (!newTitle || newTitle.length > 255) throw new ValidationError('Invalid new title')

        await this.permissionService.requireMoveAccess(user, oldTitle)

        const targetExists = await this.pageRepo.findByTitle(newTitle)
        if (targetExists && !targetExists.deleted) throw new PageExistsError(newTitle)

        const page = await this.pageRepo.findByTitle(oldTitle)
        if (!page || page.deleted) throw new PageNotFoundError(oldTitle)

        await this.pageRepo.upsertPage(newTitle, page.content, 1, false)
        await this.historyRepo.movePageHistory(oldTitle, newTitle)
        await this.pageRepo.markDeleted(oldTitle)

        logger.admin('Page moved', user, { from: oldTitle, to: newTitle })
        return { oldTitle, newTitle }
    }

    async searchPages(query, limit = 10) {
        return this.pageRepo.searchByTitle(query, limit)
    }
}

module.exports = PageService
