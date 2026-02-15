const BaseRepository = require('./BaseRepository')
const { Op } = require('sequelize')

class BlockRepository extends BaseRepository {
    async findUserBlock(username) {
        if (!username) return null
        return this.model.findOne({ where: { target: username, targetType: 'user' } })
    }

    async findActiveIpBlocks() {
        return this.model.findAll({ where: { targetType: 'ip' } })
    }

    async clearExpiredBlocks() {
        return this.model.destroy({
            where: {
                isForever: false,
                until: { [Op.lt]: new Date() }
            }
        })
    }
}

module.exports = BlockRepository
