import BaseRepository from './BaseRepository.js'

class PermissionRepository extends BaseRepository {
    async getUserPermissions(username) {
        return this.model.findAll({ where: { username } })
    }

    async hasPermission(username, permission) {
        const perm = await this.model.findOne({
            where: { username, perm: permission }
        })
        return perm !== null
    }

    async grantPermission(username, permission, givenBy) {
        return this.model.create({
            username,
            perm: permission,
            givenby: givenBy
        })
    }

    async revokePermission(username, permission) {
        return this.model.destroy({ where: { username, perm: permission } })
    }

    async revokeAllPermissions(username) {
        return this.model.destroy({ where: { username } })
    }

    async isAdmin(username) {
        return this.hasPermission(username, 'admin')
    }

    async findAllPermissions(username) {
        const perms = await this.model.findAll({ where: { username } })
        return perms.map(p => p.perm)
    }
}

export default PermissionRepository
