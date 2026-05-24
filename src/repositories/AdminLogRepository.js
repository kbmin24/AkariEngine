import BaseRepository from './BaseRepository.js'
import { Op } from 'sequelize'

class AdminLogRepository extends BaseRepository {
    async findLogsAndCount({ doneBy = undefined, job = undefined, limit = 30, offset = 0 }) {
        const where = {}

        if (doneBy !== undefined) {
            where.username = doneBy
        }

        if (job !== undefined) {
            where.job = {[Op.substring]: job}
        }

        const result = await this.model.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        })
        return { logs: result.rows, count: result.count }
    }

    async insertLog(doneBy, description) {
        await this.model.create({
            username: doneBy,
            job: description
        })
    }
}

export default AdminLogRepository