import BaseRepository from './BaseRepository.js'
import { Op } from 'sequelize'

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

    /**
     * Efficiently update categories for a page.
     * @param {String} page 
     * @param {Array<String>} newCategories
     */
    async updateCategories(page, newCategories) {
        const transaction = await this.model.sequelize.transaction()

        try {
            // identify categories to add and remove (i.e. if set A => B then set A - B, B - A)
            const oldCategories = await this.model.findAll({ where: { page }, transaction })
            const oldCategorySet = new Set(oldCategories.map(c => c.category))
            const newCategorySet = new Set(newCategories)

            const categoriesToAdd = newCategorySet.difference(oldCategorySet)
            const categoriesToRemove = oldCategorySet.difference(newCategorySet)

            if (categoriesToAdd.size > 0) {
                await this.model.bulkCreate(categoriesToAdd.map(category => ({ page, category })), { transaction })
            }

            if (categoriesToRemove.size > 0) {
                await this.model.destroy({
                    where: {
                        page,
                        category: { [Op.in]: Array.from(categoriesToRemove) }
                    },
                    transaction
                })
            }

            transaction.commit()

        } catch (err) {
            await transaction.rollback()
            throw err
        }
    }
}

export default CategoryRepository
