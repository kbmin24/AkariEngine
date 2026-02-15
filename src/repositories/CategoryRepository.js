const BaseRepository = require('./BaseRepository')

class CategoryRepository extends BaseRepository {
    async findByCategory(category) {
        return this.model.findAll({ where: { category } })
    }

    async findByPage(page) {
        return this.model.findAll({ where: { page } })
    }

    async deleteByPage(page) {
        return this.model.destroy({ where: { page } })
    }
}

module.exports = CategoryRepository
