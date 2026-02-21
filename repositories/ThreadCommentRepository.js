const BaseRepository = require('./BaseRepository')

class ThreadCommentRepository extends BaseRepository {
    async findByThreadIdOrdered(threadID) {
        return this.model.findAll({
            where: {
                threadID
            },
            order: [
                ['createdAt', 'ASC']
            ]
        })
    }
}

module.exports = ThreadCommentRepository
