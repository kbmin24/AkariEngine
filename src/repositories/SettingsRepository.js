import BaseRepository from './BaseRepository.js'

class SettingsRepository extends BaseRepository {
    async getSetting(user, key) {
        return this.model.findOne({ where: { user, key } })
    }

    async setSetting(user, key, value) {
        await this.model.destroy({ where: { user, key } })
        await this.model.create({ user, key, value })
    }
}

export default SettingsRepository