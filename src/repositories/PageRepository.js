import { Op } from 'sequelize'
import BaseRepository from './BaseRepository.js'

class PageRepository extends BaseRepository {
    constructor(pageModel, deps = {}) {
        super(pageModel)
        this.recentChangesModel = deps.recentChangesModel || null
        this.historyModel = deps.historyModel || null
        this.categoryModel = deps.categoryModel || null
        this.linkModel = deps.linkModel || null
        this.fileModel = deps.fileModel || null
        this.protectModel = deps.protectModel || null
        this.threadModel = deps.threadModel || null
        this.threadCommentModel = deps.threadCommentModel || null
        this.recentDiscussModel = deps.recentDiscussModel || null
        this.viewcountModel = deps.viewcountModel || null
    }

    async findByTitle(title) {
        return this.model.findOne({ where: { title } })
    }

    async findByTitleBatch(titles) {
        return this.findByFieldBatch('title', titles)
    }

    async findManyByTitles(titles) {
        return this.model.findAll({ where: { title: { [Op.in]: titles } } })
    }

    async searchByTitle(query, limit = 10, offset = 0) {
        return this.model.findAll({
            where: {
                title: {
                    [Op.like]: `%${query}%`
                },
                deleted: { [Op.or]: [false, null] }
            },
            order: [
                ['updatedAt', 'DESC']
            ],
            offset,
            limit
        })
    }

    async searchByContent(query, limit = 10, offset = 0) {
        return this.model.findAll({
            where: {
                content: {
                    [Op.like]: `%${query}%`
                },
                deleted: { [Op.or]: [false, null] }
            },
            order: [
                ['updatedAt', 'DESC']
            ],
            offset,
            limit
        })
    }

    async findAllPaginated(offset = 0, limit = 50) {
        return this.model.findAndCountAll({
            where: { deleted: { [Op.or]: [false, null] } },
            order: [['title', 'ASC']],
            offset,
            limit,
        })
    }

    /** findAllPaginated, but only returns title and updatedAt. */
        async findAllPaginatedLight(offset = 0, limit = 50) {
        return this.model.findAndCountAll({
            where: { deleted: { [Op.or]: [false, null] } },
            order: [['title', 'ASC']],
            offset,
            limit,
            attributes: ['title', 'updatedAt'],
        })
    }

    async autocompleteByPrefix(query, limit = 10) {
        return this.model.findAll({
            attributes: ['title'],
            where: {
                title: {
                    [Op.like]: `${query}%`
                },
                deleted: { [Op.or]: [false, null] }
            },
            order: [
                ['title', 'ASC']
            ],
            limit
        })
    }

    async findBacklinksByTitle(title, { limit, offset } = {}) {
        if (!this.linkModel) {
            return { rows: [], count: 0 }
        }

        return this.linkModel.findAndCountAll({
            where: { dest: title },
            order: [
                ['source', 'ASC']
            ],
            limit,
            offset
        })
    }

    async upsertPage(title, content, currentRev, deleted = false, recentChange = null) {
        const existing = await this.findByTitle(title)
        let page
        if (!existing) {
            page = await this.model.create({ title, content, currentRev, deleted })
            if (this.recentChangesModel && recentChange) {
                await this.recentChangesModel.create({
                    page: title,
                    rev: currentRev,
                    doneBy: recentChange.doneBy,
                    bytechange: recentChange.bytechange,
                    comment: recentChange.comment,
                    type: recentChange.type
                })
            }
            return { page, created: true }
        }

        page = await existing.update({ title, content, currentRev, deleted })
        if (this.recentChangesModel && recentChange) {
            await this.recentChangesModel.create({
                page: title,
                rev: currentRev,
                doneBy: recentChange.doneBy,
                bytechange: recentChange.bytechange,
                comment: recentChange.comment,
                type: recentChange.type
            })
        }
        return { page, created: false }
    }

    async markDeleted(title) {
        return this.model.update({ deleted: true }, { where: { title } })
    }

    async softDeletePageWithHistory({ title, doneBy, comment = '' }) {
        const page = await this.findByTitle(title)
        if (!page) {
            return { deleted: false, reason: 'not_found' }
        }
        if (page.deleted) {
            return { deleted: false, reason: 'already_deleted' }
        }

        const oldLength = page.content ? page.content.length : 0
        const nextRev = (page.currentRev || 0) + 1

        await this.model.sequelize.transaction(async (transaction) => {
            await page.update({ deleted: true, currentRev: nextRev }, { transaction })

            if (this.linkModel) {
                await this.linkModel.destroy({ where: { source: title }, transaction })
            }

            if (this.recentChangesModel) {
                await this.recentChangesModel.create({
                    page: title,
                    rev: nextRev,
                    doneBy,
                    bytechange: -oldLength,
                    comment,
                    type: 'delete'
                }, { transaction })
            }

            if (this.historyModel) {
                await this.historyModel.create({
                    page: title,
                    rev: nextRev,
                    content: page.content,
                    bytechange: -oldLength,
                    editedby: doneBy,
                    comment,
                    type: 'delete'
                }, { transaction })
            }
        })

        return { deleted: true, rev: nextRev, bytechange: -oldLength }
    }

    async getRandomPage() {
        return this.model.findOne({ order: this.model.sequelize.random() })
    }

    async getAllTitles() {
        return this.model.findAll({ attributes: ['title'] })
    }

    extractLinks(title, content) {
        const found = new Set()
        const res = []
        const shouldSkip = (text) => {
            const v = (text || '').toLowerCase()
            return v.startsWith('category') || v.startsWith('분류') || v.startsWith('http://') || v.startsWith('https://')
        }

        content.replace(/\[\[([^|\r\n]*?)\]\]/igm, (_match, p1) => {
            if (shouldSkip(p1) || found.has(p1)) return ''
            found.add(p1)
            res.push({ source: title, dest: p1 })
            return ''
        })

        content.replace(/\[\[(.*?)\|(.*?)\]\]/igm, (_match, p1) => {
            if (shouldSkip(p1) || found.has(p1)) return ''
            found.add(p1)
            res.push({ source: title, dest: p1 })
            return ''
        })

        return res
    }

    async replaceLinksForPage(title, content) {
        if (!this.linkModel) return
        const transaction = await this.linkModel.sequelize.transaction()

        try {
            // identify links to add and remove (i.e. if set A => B then set A - B, B - A)
            const oldLinks = await this.linkModel.findAll({ where: { source: title }, transaction })
            const newLinks = this.extractLinks(title, content)

            const oldDests = new Set(oldLinks.map(link => link.dest))
            const newDests = new Set(newLinks.map(link => link.dest))

            const linksToAdd = newLinks.filter(link => !oldDests.has(link.dest))
            const destsToRemove = oldDests.difference(newDests)

            if (linksToAdd.length > 0) {
                await this.linkModel.bulkCreate(linksToAdd, { transaction })
            }

            if (destsToRemove.size > 0) {
                await this.linkModel.destroy({
                    where:
                    {
                        source: title,
                        dest: { [Op.in]: Array.from(destsToRemove) }
                    },
                    transaction
                })
            }

            transaction.commit()

        } catch (err) {
            await transaction.rollback()
            throw err
        }
    }

    async deletePageWithHistory({ title, doneBy, comment = '' }) {
        const page = await this.findByTitle(title)
        if (!page) {
            return { deleted: false, reason: 'not_found' }
        }

        const oldLength = page.content ? page.content.length : 0
        const nextRev = (page.currentRev || 0) + 1

        await this.model.destroy({ where: { title } })

        if (this.categoryModel) {
            await this.categoryModel.destroy({ where: { page: title } })
        }

        if (this.linkModel) {
            await this.linkModel.destroy({ where: { source: title } })
        }

        if (this.recentChangesModel) {
            await this.recentChangesModel.create({
                page: title,
                rev: nextRev,
                doneBy,
                bytechange: -oldLength,
                comment,
                type: 'delete'
            })
        }

        if (this.historyModel) {
            await this.historyModel.create({
                page: title,
                rev: nextRev,
                bytechange: -oldLength,
                editedby: doneBy,
                comment,
                type: 'delete'
            })
        }

        return { deleted: true, rev: nextRev, bytechange: -oldLength }
    }

    async purgePage({ title, doneBy, comment = '' }) {
        const page = await this.findByTitle(title)
        if (!page) {
            return { purged: false, reason: 'not_found' }
        }

        const oldLength = page.content ? page.content.length : 0
        const purgeRev = (page.currentRev || 0) + 1
        const fileMatch = /^File:(.*)$/i.exec(title)
        const filename = fileMatch && fileMatch[1] ? fileMatch[1] : null
        let file = null

        await this.model.sequelize.transaction(async (transaction) => {
            if (this.fileModel && filename) {
                file = await this.fileModel.findOne({ where: { filename }, transaction })
            }

            let threadIds = []
            if (this.threadModel) {
                const threads = await this.threadModel.findAll({
                    where: { pagename: title },
                    attributes: ['threadID'],
                    transaction
                })
                threadIds = threads.map(thread => thread.threadID)
            }

            if (this.threadCommentModel && threadIds.length > 0) {
                await this.threadCommentModel.destroy({
                    where: { threadID: { [Op.in]: threadIds } },
                    transaction
                })
            }

            if (this.recentDiscussModel) {
                const where = threadIds.length > 0
                    ? { [Op.or]: [{ threadID: { [Op.in]: threadIds } }, { pagename: title }] }
                    : { pagename: title }
                await this.recentDiscussModel.destroy({ where, transaction })
            }

            if (this.threadModel) {
                await this.threadModel.destroy({ where: { pagename: title }, transaction })
            }

            if (this.categoryModel) {
                await this.categoryModel.destroy({ where: { page: title }, transaction })
            }

            if (this.linkModel) {
                await this.linkModel.destroy({ where: { source: title }, transaction })
            }

            if (this.historyModel) {
                await this.historyModel.destroy({ where: { page: title }, transaction })
            }

            if (this.protectModel) {
                await this.protectModel.destroy({ where: { title }, transaction })
            }

            if (this.viewcountModel) {
                await this.viewcountModel.destroy({ where: { title }, transaction })
            }

            if (this.fileModel && filename) {
                await this.fileModel.destroy({ where: { filename }, transaction })
            }

            await this.model.destroy({ where: { title }, transaction })

            if (this.recentChangesModel) {
                await this.recentChangesModel.create({
                    page: title,
                    rev: purgeRev,
                    doneBy,
                    bytechange: -oldLength,
                    comment,
                    type: 'purge'
                }, { transaction })
            }
        })

        return {
            purged: true,
            rev: purgeRev,
            bytechange: -oldLength,
            file
        }
    }

    async movePageWithRedirect({ oldTitle, newTitle, doneBy, categories = [] }) {
        const existingTarget = await this.findByTitle(newTitle)
        if (existingTarget) {
            return { moved: false, reason: 'target_exists' }
        }

        const page = await this.findByTitle(oldTitle)
        if (!page) {
            return { moved: false, reason: 'not_found' }
        }

        const oldContent = page.content || ''
        const movedRev = (page.currentRev || 0) + 1
        const redirectContent = `#redirect ${newTitle}`

        await this.model.update(
            { title: newTitle, currentRev: movedRev },
            { where: { title: oldTitle } }
        )

        await this.model.create({
            title: oldTitle,
            content: redirectContent,
            currentRev: 1,
            deleted: false
        })

        if (this.protectModel) {
            await this.protectModel.update({ title: newTitle }, { where: { title: oldTitle } })
        }

        if (this.categoryModel) {
            await this.categoryModel.destroy({ where: { page: oldTitle } })
            for (const category of categories) {
                await this.categoryModel.create({ page: newTitle, category })
            }
        }

        if (this.recentChangesModel) {
            await this.recentChangesModel.create({
                page: oldTitle,
                rev: 1,
                doneBy,
                comment: 'Autogenerated by page move',
                bytechange: redirectContent.length,
                type: 'create'
            })

            await this.recentChangesModel.create({
                page: newTitle,
                rev: movedRev,
                doneBy,
                bytechange: 0,
                comment: `Moved ${oldTitle} to ${newTitle}`,
                type: 'move'
            })
        }

        if (this.historyModel) {
            await this.historyModel.update({ page: newTitle }, { where: { page: oldTitle } })

            await this.historyModel.create({
                page: oldTitle,
                rev: 1,
                content: redirectContent,
                bytechange: redirectContent.length,
                editedby: doneBy,
                comment: 'Autogenerated by page move',
                type: 'create'
            })

            await this.historyModel.create({
                page: newTitle,
                rev: movedRev,
                content: oldContent,
                bytechange: 0,
                editedby: doneBy,
                movedFrom: oldTitle,
                movedTo: newTitle,
                comment: `Moved ${oldTitle} to ${newTitle}`,
                type: 'move'
            })
        }

        if (this.threadModel) {
            await this.threadModel.update({ pagename: newTitle }, { where: { pagename: oldTitle } })
        }

        return { moved: true, rev: movedRev }
    }

    async revertPageToRevision({ title, revertRev, comment = '', doneBy }) {
        const page = await this.findByTitle(title)
        if (!page) return { reverted: false, reason: 'not_found' }
        if (!this.historyModel) throw new Error('History model is required for revert')

        const oldRev = await this.historyModel.findOne({ where: { page: title, rev: revertRev } })
        if (!oldRev) return { reverted: false, reason: 'revision_not_found' }

        const oldLength = (page.content || '').length
        const newContent = oldRev.content || ''
        const nextRev = (page.currentRev || 0) + 1

        await page.update({ content: newContent, deleted: false, currentRev: nextRev })

        if (this.linkModel) {
            await this.replaceLinksForPage(title, newContent)
        }

        if (this.recentChangesModel) {
            await this.recentChangesModel.create({
                page: title,
                rev: nextRev,
                doneBy,
                bytechange: newContent.length - oldLength,
                comment,
                type: 'revert'
            })
        }

        await this.historyModel.create({
            page: title,
            rev: nextRev,
            content: newContent,
            bytechange: newContent.length - oldLength,
            editedby: doneBy,
            comment,
            revertTo: revertRev,
            type: 'revert'
        })

        return { reverted: true, rev: nextRev }
    }

}

export default PageRepository
