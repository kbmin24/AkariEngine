import { Op } from 'sequelize'
import BaseRepository from './BaseRepository.js'

class RecentDiscussRepository extends BaseRepository {
    async purgeOldEntires() {
        // keep only 100 entires, purge the rest
        this.model.findAll({
            limit: 1,
            order: [['id', 'DESC']]
        })
            .then(entries => {
                if (entries.length == 0) return
                const latestChange = entries[0].id
                this.model.destroy(
                    {
                        where:
                        {
                            id: { [Op.lt]: latestChange - 100 }
                        }
                    })
            })
    }

    /**
     * Finds the 100 most recent thread models. Purges old ones.
     * @returns Array of 100 most recent thread models
     */
    async findRecent100() {
        await this.purgeOldEntires()
        return this.model.findAll({
            order: [['id', 'DESC']]
        })
    }

    async createNewEntry(threadname, threadID, pagename) {
        return this.model.create({
            threadname,
            threadID,
            pagename
        })
    }

    async destroyByThreadId(threadID) {
        return this.model.destroy({ where: { threadID } })
    }
}

export default RecentDiscussRepository
