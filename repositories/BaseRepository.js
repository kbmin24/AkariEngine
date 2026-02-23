class BaseRepository {
    constructor(model) {
        this.model = model
    }

    async findById(id) {
        return this.model.findByPk(id)
    }

    async findOne(where) {
        return this.model.findOne({ where })
    }

    async findAll(options = {}) {
        return this.model.findAll(options)
    }

    async create(data) {
        return this.model.create(data)
    }

    async updateById(id, data) {
        const record = await this.findById(id)
        if (!record) return null
        return record.update(data)
    }

    async deleteById(id) {
        const record = await this.findById(id)
        if (!record) return false
        await record.destroy()
        return true
    }

    async count(where = {}) {
        return this.model.count({ where })
    }
}

export default BaseRepository
