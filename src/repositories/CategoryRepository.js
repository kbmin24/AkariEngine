import BaseRepository from './BaseRepository.js'

class CategoryRepository extends BaseRepository {
    async findByCategory(category) {
        return this.model.findAll({ where: { category } })
    }

    async findAndCountByCategory(category) {
        return this.model.findAndCountAll({
            where: { category },
            order: [['page', 'ASC']]
        })
    }

    async findByPage(page) {
        return this.model.findAll({ where: { page } })
    }

    async deleteByPage(page) {
        return this.model.destroy({ where: { page } })
    }
}

export default CategoryRepository
