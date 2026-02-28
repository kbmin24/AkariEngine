import BaseRepository from './BaseRepository.js'

class ViewcountRepository extends BaseRepository {
    async findTopPages(limit = 30) {
        return this.model.findAll({
            order: [['count', 'DESC']],
            limit
        })
    }
}

export default ViewcountRepository
