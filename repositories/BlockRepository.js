import BaseRepository from './BaseRepository.js'
import { Op } from 'sequelize'

class BlockRepository extends BaseRepository {
    async findBlock(target, targetType) {
        if (!target || !targetType) return null
        return this.model.findOne({ where: { target, targetType } })
    }

    async deleteBlock(target, targetType) {
        if (!target || !targetType) return 0
        return this.model.destroy({ where: { target, targetType } })
    }

    async createUserBlock({ target, isForever, doneBy, comment, until = null }) {
        return this.model.create({
            target,
            targetType: 'user',
            isForever,
            doneBy,
            until,
            comment
        })
    }

    async createIpBlock({ target, startIP, endIP, isForever, doneBy, comment, allowLogin = false, until = null }) {
        return this.model.create({
            target,
            startIP,
            endIP,
            targetType: 'ip',
            isForever,
            doneBy,
            until,
            allowLogin,
            comment
        })
    }

    async findUserBlock(username) {
        if (!username) return null
        return this.model.findOne({ where: { target: username, targetType: 'user' } })
    }

    async findActiveIpBlocks() {
        return this.model.findAll({ where: { targetType: 'ip' } })
    }

    async findIpBlocksContaining(ipAsNumber) {
        return this.model.findAll({
            where: {
                targetType: 'ip',
                startIP: { [Op.lte]: ipAsNumber },
                endIP: { [Op.gte]: ipAsNumber }
            }
        })
    }

    async clearExpiredBlocks() {
        return this.model.destroy({
            where: {
                isForever: false,
                until: { [Op.lt]: new Date() }
            }
        })
    }
}

export default BlockRepository;
