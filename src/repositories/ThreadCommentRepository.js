import BaseRepository from './BaseRepository.js'

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

export default ThreadCommentRepository
