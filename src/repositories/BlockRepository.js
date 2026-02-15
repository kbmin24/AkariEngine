const BaseRepository = require('./BaseRepository')

class BlockRepository extends BaseRepository {
    async findUserBlock(username) {
        return this.model.findOne({ where: { target: username, targetType: 'user' } })
    }
}

module.exports = BlockRepository
