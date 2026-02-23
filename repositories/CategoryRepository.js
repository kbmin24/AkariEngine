import BaseRepository from './BaseRepository.js'

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

export default CategoryRepository
