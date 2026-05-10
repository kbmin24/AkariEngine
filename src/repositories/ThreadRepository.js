import BaseRepository from './BaseRepository.js'

class ThreadRepository extends BaseRepository {
    /**
     * Finds open threads by their page name.
     * @param {String} pageName 
     * @returns {Promise<Array>} A list of open threads associated with the given page name.
     */
    async findOpenByPageName(pageName) {
        return this.model.findAll({
            where: {
                pagename: pageName,
                isOpen: true
            }
        })
    }

    /**
     * Finds closed threads by their page name.
     * @param {String} pageName 
     * @returns {Promise<Array>} A list of closed threads associated with the given page name.
     */
    async findClosedByPageName(pageName) {
        return this.model.findAll({
            where: {
                pagename: pageName,
                isOpen: false
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

    async isOpen(threadID) {
        const thread = await this.findByThreadId(threadID)
        if (!thread) return null
        return thread.isOpen
    }

    async createNewThread(pagename, threadID, threadTitle) {
        return this.model.create(
            {
                threadID,
                threadTitle,
                pagename
            })
    }
}

export default ThreadRepository
