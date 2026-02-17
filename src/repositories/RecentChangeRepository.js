const { Op } = require('sequelize')
const BaseRepository = require('./BaseRepository')

class RecentChangeRepository extends BaseRepository {
    async trimToLatest(limit = 100) {
        const latest = await this.model.findOne({
            attributes: ['id'],
            order: [['id', 'DESC']]
        })

        const latestId = latest ? latest.id : 0
        await this.model.destroy({
            where: {
                id: { [Op.lt]: latestId - limit }
            }
        })
    }

    async findAllDesc() {
        return this.model.findAll({
            order: [['id', 'DESC']]
        })
    }
}

module.exports = RecentChangeRepository
