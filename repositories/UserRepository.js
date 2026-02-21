const BaseRepository = require('./BaseRepository')

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
}

module.exports = UserRepository
