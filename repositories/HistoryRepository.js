const BaseRepository = require('./BaseRepository')

class HistoryRepository extends BaseRepository {
    async findByPageAndRev(page, rev) {
        return this.model.findOne({ where: { page, rev } })
    }

    async movePageHistory(oldTitle, newTitle) {
        return this.model.update({ page: newTitle }, { where: { page: oldTitle } })
    }
}

module.exports = HistoryRepository
