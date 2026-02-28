import BaseRepository from './BaseRepository.js'

class ThreadRepository extends BaseRepository {
    async findOpenByPageName(pageName) {
        return this.model.findAll({
            where: {
                pagename: pageName,
                isOpen: true
            }
        })
    }

    async findByThreadId(threadID) {
        return this.model.findOne({
            where: {
                threadID
            }
        })
    }
}

export default ThreadRepository
