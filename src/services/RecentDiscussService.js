class RecentDiscussService {
    constructor(recentDiscussRepository, threadRepository) {
        this.recentDiscussRepository = recentDiscussRepository
        this.threadRepository = threadRepository
    }

    /**
     * Fetches the 100 most recent threads
     * @param {Boolean} [isopen=true] If true, only returns open threads. If false, only returns closed threads.
     */
    async getRecentDiscuss(isopen = true)
    {
        const recentDiscussEntries = await this.recentDiscussRepository.findRecent100()
        const filteredEntries = []
        for (let m of recentDiscussEntries) {
            let th = await this.threadRepository.isOpen(m.threadID)
            if (th === isopen) {
                filteredEntries.push(m)
            }
        }
        return filteredEntries
    }
}

export default RecentDiscussService
