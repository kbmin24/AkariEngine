import BaseRepository from './BaseRepository.js'

class HistoryRepository extends BaseRepository {
    async findByPageAndRev(page, rev) {
        return this.model.findOne({ where: { page, rev } })
    }

    async movePageHistory(oldTitle, newTitle) {
        return this.model.update({ page: newTitle }, { where: { page: oldTitle } })
    }
}

export default HistoryRepository
