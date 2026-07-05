import BaseRepository from './BaseRepository.js'

class HistoryRepository extends BaseRepository {
    async findByPageAndRev(page, rev) {
        return this.model.findOne({ where: { page, rev } })
    }

    async findLatestRevByPage(page) {
        const rev = await this.model.max('rev', { where: { page } })
        return rev === null ? 0 : Number(rev)
    }

    async findAndCountByPageDesc(page, { limit, offset } = {}) {
        return this.model.findAndCountAll({
            where: { page },
            order: [['id', 'DESC']],
            limit,
            offset,
            raw: true,
            attributes: {
                exclude: ['content']
            }
        })
    }

    async findByUsernameDesc(username, limit, offset) {
        return this.model.findAndCountAll({
            where: { editedBy: username },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            attributes: {
                exclude: ['content']
            }
        })
    }

    async movePageHistory(oldTitle, newTitle) {
        return this.model.update({ page: newTitle }, { where: { page: oldTitle } })
    }
}

export default HistoryRepository
