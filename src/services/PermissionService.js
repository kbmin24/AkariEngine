const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const ipRangeCheck = require('ip-range-check')
const dateandtime = require('date-and-time')
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

    formatBlockMessage(block, isIpBlock = false) {
        if (isIpBlock) {
            if (block.isForever) {
                return `Your ip address or its range (${block.target}) is blocked forever by ${block.doneBy} - ${block.comment}`
            }
            return `Your ip address or its range (${block.target}) is blocked until ${dateandtime.format(block.until, global.dtFormat)} by ${block.doneBy} - ${block.comment}`
        }

        if (block.isForever) {
            return `You are blocked forever by ${block.doneBy} - ${block.comment}`
        }
        return `You are blocked until ${dateandtime.format(block.until, global.dtFormat)} by ${block.doneBy} - ${block.comment}`
    }

    formatLoginRequiredMessage(action) {
        return global.i18n.__(`loginneeded`)
    }

    async checkAccessDetailed(user, resource, action = 'read', context = {}) {
        await this.blockRepo.clearExpiredBlocks()

        const protection = await this.protectRepo.findProtection(resource, action)
        const requiredLevel = protection ? protection.protectionLevel : 'everyone'

        if (requiredLevel !== 'blocked') {
            const ipAddress = context.ipAddress
            if (ipAddress) {
                const ipBlocks = await this.blockRepo.findActiveIpBlocks()
                for (const ipBlock of ipBlocks) {
                    if (ipBlock.allowLogin && user) continue
                    if (ipRangeCheck(ipAddress, ipBlock.target)) {
                        return {
                            allowed: false,
                            requiredLevel,
                            reason: 'ip_block',
                            block: ipBlock,
                            message: this.formatBlockMessage(ipBlock, true)
                        }
                    }
                }
            }
        }

        switch (requiredLevel) {
        case 'blocked':
            return { allowed: true, requiredLevel }

        case 'everyone': {
            if (!user) return { allowed: true, requiredLevel }
            const userBlock = await this.blockRepo.findUserBlock(user)
            if (userBlock) {
                return {
                    allowed: false,
                    requiredLevel,
                    reason: 'user_block',
                    block: userBlock,
                    message: this.formatBlockMessage(userBlock, false)
                }
            }
            return { allowed: true, requiredLevel }
        }

        case 'login':
            if (!user) {
                return {
                    allowed: false,
                    requiredLevel,
                    reason: 'login_required',
                    message: this.formatLoginRequiredMessage(action)
                }
            }
            return { allowed: true, requiredLevel }

        case 'admin': {
            if (!user) {
                return {
                    allowed: false,
                    requiredLevel,
                    reason: 'login_required',
                    message: this.formatLoginRequiredMessage(action)
                }
            }
            const isAdmin = await this.permissionRepo.isAdmin(user)
            return { allowed: isAdmin, requiredLevel, reason: isAdmin ? null : 'permission_denied' }
        }

        default:
            if (!user) {
                return {
                    allowed: false,
                    requiredLevel,
                    reason: 'login_required',
                    message: this.formatLoginRequiredMessage(action)
                }
            }
            return {
                allowed: await this.permissionRepo.hasPermission(user, requiredLevel),
                requiredLevel,
                reason: 'permission_denied'
            }
        }
    }

    async checkAccess(user, resource, action = 'read', context = {}) {
        const result = await this.checkAccessDetailed(user, resource, action, context)
        return result.allowed
    }

    async requireReadAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'read', context)
        if (!result.allowed) {
            throw new PermissionDeniedError('read', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                block: result.block,
                message: result.message
            })
        }
    }

    async requireWriteAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'edit', context)
        if (!result.allowed) {
            throw new PermissionDeniedError('edit', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                block: result.block,
                message: result.message
            })
        }
    }

    async requireMoveAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'move', context)
        if (!result.allowed) {
            throw new PermissionDeniedError('move', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                block: result.block,
                message: result.message
            })
        }
    }

    async requirePermission(user, permission) {
        if (!user) throw new AuthenticationRequiredError()

        const hasPermission = await this.permissionRepo.hasPermission(user, permission)
        if (!hasPermission) throw new PermissionDeniedError(permission, null, {message: global.i18n.__('deletepermneeded')})
    }

    async grantPermission(adminUser, targetUser, permission) {
        await this.requirePermission(adminUser, 'grant')
        await this.permissionRepo.grantPermission(targetUser, permission, adminUser)
        logger.admin('Permission granted', adminUser, { target: targetUser, permission })
    }
}

module.exports = PermissionService
