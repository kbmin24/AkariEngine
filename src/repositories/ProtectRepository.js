import BaseRepository from './BaseRepository.js'

class ProtectRepository extends BaseRepository {
    async findAllByTitle(title) {
        return this.model.findAll({ where: { title } })
    }
    
    async findAllByTitleAndRevision(title, revision) {
        return this.model.findAll({ where: { title, revision } })
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

    async setRevisionProtection(title, revision, protectionLevel) {
        await this.model.destroy({ where: { title, revision } })
        await this.model.create({ title, task: 'read', revision, protectionLevel })
    }

    async deleteRevisionProtection(title, revision) {
        return this.model.destroy({ where: { title, task: 'read', revision } })
    }

    async findProtection(title, task, revision = null) {
        const where = { title, task }
        if (revision !== null) {
            where.revision = revision
        } else {
            // Page-level ACL: must not match revision-specific ACL rows.
            where.revision = null
        }
        return this.model.findOne({ where })
    }
}

export default ProtectRepository
