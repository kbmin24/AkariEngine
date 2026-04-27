import BaseRepository from './BaseRepository.js'
import { Op } from 'sequelize'

const RETENTION_MS = 7257600000 // 84 days

class LoginHistoryRepository extends BaseRepository {
    async pruneOldRecords() {
        await this.model.destroy({
            where: {
                createdAt: { [Op.lt]: new Date(Date.now() - RETENTION_MS) }
            }
        })
    }

    async findByUsername(username) {
        return this.model.findAll({
            where: { username },
            order: [['createdAt', 'DESC']]
        })
    }
}

export default LoginHistoryRepository
