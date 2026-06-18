import diff2html from 'diff2html'
import { createTwoFilesPatch } from 'diff'
import logger from '../utils/logger.js'

import {
    PageNotFoundError,
    RevisionNotFoundError,
    ValidationError
} from './errors.js'

class HistoryService {
    constructor(historyRepo, pageRepo, permissionService) {
        this.historyRepo = historyRepo
        this.pageRepo = pageRepo
        this.permissionService = permissionService
    }

    async getHistoryViewModel({ title, from, to, user, ipAddress }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'HISTORY_TITLE_NEEDED'
            })
        }

        await this.permissionService.requireReadAccess(user, title, { ipAddress })

        const pgSize = 30
        let normalizedFrom = Number(from)
        let normalizedTo = Number(to)

        if (!Number.isInteger(normalizedFrom) || normalizedFrom < 1) normalizedFrom = 1
        if (!Number.isInteger(normalizedTo) || normalizedTo < normalizedFrom) normalizedTo = normalizedFrom + pgSize - 1

        const requestedSize = normalizedTo - normalizedFrom + 1
        const limit = Math.min(requestedSize, pgSize)
        const offset = normalizedFrom - 1

        const changes = await this.historyRepo.findAndCountByPageDesc(title, { limit, offset })
        if (!changes || changes.count === 0) {
            throw new PageNotFoundError(title)
        }

        normalizedTo = normalizedFrom + changes.rows.length - 1
        if (normalizedTo > changes.count) normalizedTo = changes.count

        return {
            title,
            changes: changes.rows,
            historyCount: changes.count,
            from: normalizedFrom,
            to: normalizedTo,
            pgSize
        }
    }

    async getDiffViewModel({ title, rev1, rev2, user, ipAddress }) {
        if (!title) {
            throw new ValidationError({
                message: 'No page title is provided.',
                i18nKey: 'page404',
                statusCode: 404,
                code: 'DIFF_TITLE_NEEDED'
            })
        }

        if (rev1 === undefined || rev2 === undefined) {
            throw new ValidationError({
                message: 'No revision is provided.',
                i18nKey: 'norevision',
                statusCode: 404,
                code: 'DIFF_REV_NEEDED'
            })
        }

        let firstRev = Number(rev1)
        let secondRev = Number(rev2)

        if (!Number.isInteger(firstRev) || !Number.isInteger(secondRev)) {
            throw new ValidationError({
                message: 'No revision is provided.',
                i18nKey: 'norevision',
                statusCode: 404,
                code: 'DIFF_REV_INVALID'
            })
        }

        if (firstRev > secondRev) [firstRev, secondRev] = [secondRev, firstRev]

        await this.permissionService.requireReadAccess(user, title, { ipAddress, revision: firstRev })
        if (firstRev !== secondRev) {
            await this.permissionService.requireReadAccess(user, title, { ipAddress, revision: secondRev })
        }

        const pagev1 = await this.historyRepo.findByPageAndRev(title, firstRev)
        if (!pagev1) throw new RevisionNotFoundError(title, firstRev)

        const pagev2 = await this.historyRepo.findByPageAndRev(title, secondRev)
        if (!pagev2) throw new RevisionNotFoundError(title, secondRev)

        const cont1 = String(pagev1.content || '').replace(/\r\n/g, '\n')
        const cont2 = String(pagev2.content || '').replace(/\r\n/g, '\n')

        const difference = createTwoFilesPatch(`r${firstRev}`, `r${secondRev}`, cont1, cont2)
        const diffHtml = diff2html.html(difference, {
            outputFormat: 'line-by-line',
            drawFileList: false,
            matching: 'lines'
        })

        return {
            pagename: title,
            rev1: firstRev,
            rev2: secondRev,
            diffHtml
        }
    }

    async revertPage({ title, revertRev, user, ipAddress, comment = '' }) {
        if (!title) throw new ValidationError('Page title is required')
        if (revertRev === undefined || revertRev === null || Number.isNaN(Number(revertRev))) {
            throw new ValidationError('Revision is required')
        }

        await this.permissionService.requireWriteAccess(user, title, { ipAddress })

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

    // gets user/ip's contributions. Entity can be either id or username.
    async getContributions(entity, showfrom = 0) {
        return this.historyRepo.findByUsernameDesc(entity, 100, showfrom)
    }

    async pageHistoryExists({ title, user, ipAddress }) {
        if (!title) {
            throw new ValidationError({
                i18nKey: 'illegalaccess',
                statusCode: 400,
                code: 'HISTORY_TITLE_NEEDED'
            })
        }

        await this.permissionService.requireReadAccess(user, title, { ipAddress })

        let r1 = this.historyRepo.findByPageAndRev(title, 1)
        return !!r1
    }
}

export default HistoryService
