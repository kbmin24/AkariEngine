const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const {
    PermissionDeniedError,
    AuthenticationRequiredError
} = require('./errors')

class PermissionService {
    constructor(permissionRepo, blockRepo, protectRepo) {
        this.permissionRepo = permissionRepo
        this.blockRepo = blockRepo
        this.protectRepo = protectRepo
    }

    async checkAccess(user, resource, action = 'read') {
        const protection = await this.protectRepo.findProtection(resource, action)
        const requiredLevel = protection ? protection.protectionLevel : 'everyone'
        return this.satisfiesLevel(user, requiredLevel)
    }

    async requireReadAccess(user, title) {
        const hasAccess = await this.checkAccess(user, title, 'read')
        if (!hasAccess) throw new PermissionDeniedError('read', title)
    }

    async requireWriteAccess(user, title) {
        const hasAccess = await this.checkAccess(user, title, 'edit')
        if (!hasAccess) throw new PermissionDeniedError('edit', title)
    }

    async requireMoveAccess(user, title) {
        const hasAccess = await this.checkAccess(user, title, 'move')
        if (!hasAccess) throw new PermissionDeniedError('move', title)
    }

    async requirePermission(user, permission) {
        if (!user) throw new AuthenticationRequiredError()

        const hasPermission = await this.permissionRepo.hasPermission(user, permission)
        if (!hasPermission) throw new PermissionDeniedError(permission)
    }

    async satisfiesLevel(user, level) {
        switch (level) {
        case 'everyone':
            return true
        case 'login':
            return user !== undefined && user !== null
        case 'admin':
            if (!user) return false
            return this.permissionRepo.isAdmin(user)
        case 'blocked':
            return false
        default:
            if (!user) return false
            return this.permissionRepo.hasPermission(user, level)
        }
    }

    async grantPermission(adminUser, targetUser, permission) {
        await this.requirePermission(adminUser, 'grant')
        await this.permissionRepo.grantPermission(targetUser, permission, adminUser)
        logger.admin('Permission granted', adminUser, { target: targetUser, permission })
    }
}

module.exports = PermissionService
