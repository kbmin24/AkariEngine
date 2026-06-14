import { fn, col, where } from 'sequelize'
import BaseRepository from './BaseRepository.js'

class UserRepository extends BaseRepository {
    async findByUsername(username) {
        return this.model.findOne({ where: { username } })
    }

    async createUser(username, hashedPassword, salt) {
        return this.model.create({
            username,
            password: hashedPassword,
            salt
        })
    }

    async updatePassword(username, hashedPassword, salt) {
        return this.model.update(
            { password: hashedPassword, salt },
            { where: { username } }
        )
    }

    async exists(username) {
        const count = await this.model.count({ where: { username } })
        return count > 0
    }

    async existsCaseInsensitive(username) {
        const count = await this.model.count({
            where: where(fn('lower', col('username')), username.toLowerCase())
        })
        return count > 0
    }
}

export default UserRepository
