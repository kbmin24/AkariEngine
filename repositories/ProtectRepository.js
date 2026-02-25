import BaseRepository from './BaseRepository.js'

class ProtectRepository extends BaseRepository {
    async findAllByTitle(title) {
        return this.model.findAll({ where: { title } })
    }

    async replacePageProtections(title, rules = {}) {
        await this.model.destroy({ where: { title } })

        const entries = Object.entries(rules)
        if (entries.length === 0) return

        await this.model.bulkCreate(entries.map(([task, protectionLevel]) => ({
            title,
            revision: null,
            task,
            protectionLevel
        })))
    }

    async findProtection(title, task, revision = null) {
        const where = { title, task }
        if (revision !== null && revision !== undefined) {
            where.revision = revision
        } else {
            // Page-level ACL: must not match revision-specific ACL rows.
            where.revision = null
        }
        return this.model.findOne({ where })
    }
}

export default ProtectRepository
