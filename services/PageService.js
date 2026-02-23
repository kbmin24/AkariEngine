import paths from '../utils/paths.js'
import fs from 'fs'
import date from 'date-and-time'
import logger from '../utils/logger.js'

import {
    PageNotFoundError,
    PageExistsError,
    RevisionNotFoundError,
    ValidationError,
    AuthenticationRequiredError
} from './errors.js'

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

        let page
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

    splitEditSection(content, section) {
        let prefix = ''
        let suffix = ''
        let body = content

        if (!section || Number.isNaN(Number(section)) || Number(section) <= 0) {
            return { prefix, suffix, content: body }
        }

        const sectionIndex = Number(section)
        const headLookupRegex = /(?=^(?:=+) (?:.*) =+(?: )*\r?\n)/gim
        const splits = body.split(headLookupRegex)
        let offset = 0
        if (/^(?:=+) (?:.*) =+(?: )*\r?\n/igm.test(splits[0])) offset = -1

        if (sectionIndex + offset > splits.length) {
            throw new ValidationError({
                i18nKey: 'edit_noparagraph',
                statusCode: 200,
                code: 'EDIT_NO_PARAGRAPH'
            })
        }

        for (let i = 0; i < sectionIndex + offset; i++) prefix += splits[i]
        for (let i = sectionIndex + offset + 1; i < splits.length; i++) suffix += splits[i]
        body = splits[sectionIndex + offset]

        return { prefix, suffix, content: body }
    }

    async getEditViewModel({ title, section, aclState, username }) {
        title = title.trim()

        const page = await this.pageRepo.findByTitle(title)
        if (!page && title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'pagename_illegalfile',
                statusCode: 200,
                code: 'ILLEGAL_FILE_TITLE'
            })
        }

        const actionAllowed = aclState ? aclState.allowed : true
        const notification = (!actionAllowed && aclState && aclState.error)
            ? aclState.error.message
            : undefined

        const rawContent = page ? page.content : ''
        const sectionResult = actionAllowed
            ? this.splitEditSection(rawContent, section)
            : { prefix: '', suffix: '', content: rawContent }

        return {
            title,
            username,
            content: sectionResult.content,
            prefix: sectionResult.prefix,
            suffix: sectionResult.suffix,
            disabled: actionAllowed !== true,
            needsCaptcha: actionAllowed === true,
            notification
        }
    }

    async getRawContent({ title, rev }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'RAW_TITLE_NEEDED'
            })
        }

        const page = rev === undefined
            ? await this.pageRepo.findByTitle(title)
            : await this.historyRepo.findByPageAndRev(title, rev)

        if (!page || page.deleted) throw new PageNotFoundError(title)
        return page.content
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
        if (!page) throw new PageNotFoundError(title)

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

        const page = await this.pageRepo.findByTitle(title)
        if (!page) throw new PageNotFoundError(title)

        return {
            title,
            username,
            pagename: page.title
        }
    }

    async sign(req, settingsModel) {
        const dtnow = date.format(new Date(), global.dtFormat)
        if (req.session.username) {
            const s = await settingsModel.findOne({
                where: {
                    user: req.session.username,
                    key: 'sign'
                }
            })
            const prefix = s ? s.value : `[[User:${req.session.username}]]`
            return `${prefix} ${dtnow}`
        }

        return `${req.ipAddress} ${dtnow}`
    }

    async signAsync(req, str, regex, settingsModel) {
        const promises = []
        str.replace(regex, () => {
            promises.push(this.sign(req, settingsModel))
        })
        const data = await Promise.all(promises)
        return str.replace(regex, () => data.shift())
    }

    async buildNormalizedEditContent({ req, content, editPrefix = '', editSuffix = '' }) {
        const rawBody = content.endsWith('\n') ? content : `${content}\n`
        const merged = `${editPrefix}${rawBody}${editSuffix}`.replace(/\r/g, '')
        return this.signAsync(req, merged, /~~~~/igm, global.db.settings)
    }

    async editPage({ title, content, user, comment, req, editPrefix = '', editSuffix = '', ipAddress }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'edit_titleneeded',
                statusCode: 200,
                code: 'EDIT_TITLE_NEEDED'
            })
        }
        if (!content && content !== '') {
            throw new ValidationError({
                i18nKey: 'edit_titleneeded',
                statusCode: 200,
                code: 'EDIT_CONTENT_NEEDED'
            })
        }

        const normalizedContent = req
            ? await this.buildNormalizedEditContent({ req, content, editPrefix, editSuffix })
            : content

        const existingPage = await this.pageRepo.findByTitle(title)
        if (!existingPage && title.toLowerCase().startsWith('file:')) {
            throw new ValidationError({
                i18nKey: 'pagename_illegalfile',
                statusCode: 200,
                code: 'ILLEGAL_FILE_TITLE'
            })
        }

        await this.permissionService.requireWriteAccess(user, title, { ipAddress })

        const doneBy = user || ipAddress
        const isNewPage = !existingPage
        const oldContent = existingPage ? existingPage.content : ''
        const byteChange = normalizedContent.length - oldContent.length
        const nextRev = (existingPage ? existingPage.currentRev : 0) + 1

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

        logger.info('Page edited', { title, user: doneBy, rev: nextRev })
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

    async autocompletePages(query, limit = 10) {
        if (!query || typeof query !== 'string') return []

        const normalized = query.trim()
        if (!normalized) return []

        return this.pageRepo.autocompleteByPrefix(normalized, limit)
    }
}

export default PageService;
