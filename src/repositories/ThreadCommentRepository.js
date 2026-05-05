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

    async findByThreadIdAtOffset(threadID, offset) {
        return this.model.findOne({
            where: { threadID },
            order: [['createdAt', 'ASC']],
            offset
        })
    }
}

export default ThreadCommentRepository
