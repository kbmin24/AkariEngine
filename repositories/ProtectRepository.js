const BaseRepository = require('./BaseRepository')

class ProtectRepository extends BaseRepository {
    async findProtection(title, task, revision = null) {
        const where = { title, task }
        if (revision !== null && revision !== undefined) where.revision = revision
        return this.model.findOne({ where })
    }
}

module.exports = ProtectRepository
