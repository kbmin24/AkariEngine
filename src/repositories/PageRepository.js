const { Op } = require('sequelize')
const BaseRepository = require('./BaseRepository')

class PageRepository extends BaseRepository {
    async findByTitle(title) {
        return this.model.findOne({ where: { title } })
    }

    async searchByTitle(query, limit = 10) {
        return this.model.findAll({
            where: {
                title: {
                    [Op.like]: `%${query}%`
                }
            },
            limit
        })
    }

    async upsertPage(title, content, currentRev, deleted = false) {
        const existing = await this.findByTitle(title)
        if (!existing) {
            const page = await this.model.create({ title, content, currentRev, deleted })
            return { page, created: true }
        }

        const page = await existing.update({ title, content, currentRev, deleted })
        return { page, created: false }
    }

    async markDeleted(title) {
        return this.model.update({ deleted: true }, { where: { title } })
    }

    async getRandomPage() {
        return this.model.findOne({ order: this.model.sequelize.random() })
    }

    async getAllTitles() {
        return this.model.findAll({ attributes: ['title'] })
    }
}

module.exports = PageRepository
