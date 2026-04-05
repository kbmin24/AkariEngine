import BaseRepository from './BaseRepository.js'

class ViewcountRepository extends BaseRepository {
    constructor(model, updateTimeModel) {
        super(model)
        this.updateTimeModel = updateTimeModel
    }

    async findTopPages(limit = 30) {
        return this.model.findAll({
            order: [['count', 'DESC']],
            limit
        })
    }

    async incrementForTitle(title) {
        const u = await this.updateTimeModel.findOne({ where: { key: 'viewcount' } })
        if (u) {
            if (u.value.getDate() != (new Date()).getDate()) {
                await this.model.destroy({ where: {}, truncate: true })
                await u.update({ value: new Date() })
            }
        } else {
            await this.updateTimeModel.create({ key: 'viewcount', value: new Date() })
        }
        const p = await this.model.findOne({ where: { title } })
        if (p) await p.update({ count: p.count + 1 })
        else await this.model.create({ title, count: 1 })
    }
}

export default ViewcountRepository
