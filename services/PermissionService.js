const logger = require('../utils/logger.js')
const dateandtime = require('date-and-time')
const {
    PermissionDeniedError,
    AuthenticationRequiredError
} = require('./errors')

class PermissionService {
    constructor(permissionRepo, blockRepo, protectRepo, blockService = null) {
        this.permissionRepo = permissionRepo
        this.blockRepo = blockRepo
        this.protectRepo = protectRepo
        this.blockService = blockService
    }

    formatBlockMessage(block, isIpBlock = false) {
        // This message is fallback; default is i18nKey.
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
        return `Login is required for ${action}`
    }

    buildUserBlockResult(userBlock, requiredLevel) {
        let res = {
            allowed: false,
            requiredLevel,
            reason: 'user_block',
            i18nParams: { user: userBlock.target, doneBy: userBlock.doneBy, comment: userBlock.comment },
            block: userBlock,
            message: this.formatBlockMessage(userBlock, false)
        }
        if (userBlock.isForever) {
            res.i18nKey = 'user_blocked_forever'
        }
        else {
            res.i18nKey = 'user_blocked'
            res.i18nParams.until = dateandtime.format(userBlock.until, global.dtFormat)
        }
        return res
    }

    async checkAccessDetailed(user, resource, action = 'read', context = {}) {

        const requiredLevelOverride = context.requiredLevel
        const protection = requiredLevelOverride ? null : await this.protectRepo.findProtection(resource, action)
        let requiredLevel
        if (requiredLevelOverride)
        {
            requiredLevel = requiredLevelOverride
        }
        else if (protection)
        {
            requiredLevel = protection.protectionLevel
        }
        else if (Object.hasOwn(context, 'fallbackLevel'))
        {
            requiredLevel = context.fallbackLevel
        }
        else
        {
            requiredLevel = 'everyone'
        }

        if (requiredLevel !== 'blocked') {
            const ipAddress = context.ipAddress
            if (ipAddress && this.blockService) {
                const ipBlock = await this.blockService.findIPBlock(ipAddress)
                if (ipBlock && !(ipBlock.allowLogin && user)) {
                    let res = {
                        allowed: false,
                        requiredLevel,
                        reason: 'ip_block',
                        i18nParams: { ip: ipBlock.target, doneBy: ipBlock.doneBy, comment: ipBlock.comment },
                        block: ipBlock,
                        message: this.formatBlockMessage(ipBlock, true)
                    }
                    if (ipBlock.isForever) {
                        res.i18nKey = 'ip_blocked_forever'
                    }
                    else {
                        res.i18nKey = 'ip_blocked'
                        res.i18nParams.until = dateandtime.format(ipBlock.until, global.dtFormat)
                    }
                    return res
                }
            }
        }

        switch (requiredLevel) {
            case 'blocked':
                return { allowed: true, requiredLevel }

            case 'everyone': {
                if (!user) return { allowed: true, requiredLevel } // ip block already checked
                const userBlock = await this.blockRepo.findUserBlock(user)
                if (userBlock) {
                    return this.buildUserBlockResult(userBlock, requiredLevel)
                }
                return { allowed: true, requiredLevel }
            }

            case 'login':
                {
                    if (!user) {
                        return {
                            allowed: false,
                            requiredLevel,
                            i18nKey: 'loginneeded',
                            reason: 'login_required',
                            message: this.formatLoginRequiredMessage(action)
                        }
                    }

                    const userBlock = await this.blockRepo.findUserBlock(user)
                    if (userBlock) {
                        return this.buildUserBlockResult(userBlock, requiredLevel)
                    }

                    return { allowed: true, requiredLevel }
                }

            case 'admin': {
                if (!user) {
                    return {
                        allowed: false,
                        requiredLevel,
                        i18nKey: 'loginneeded',
                        reason: 'login_required',
                        message: this.formatLoginRequiredMessage(action)
                    }
                }
                const isAdmin = await this.permissionRepo.isAdmin(user)
                return {
                    allowed: isAdmin,
                    requiredLevel,
                    i18nKey: "admin_required",
                    reason: isAdmin ? null : 'permission_denied'
                }
            }

            default:
                // Honestly this route should never show up, it just exists for the sake of existing.
                if (!user) {
                    return {
                        allowed: false,
                        requiredLevel,
                        i18nKey: 'loginneeded',
                        reason: 'login_required',
                        message: this.formatLoginRequiredMessage(action)
                    }
                }
                return {
                    allowed: await this.permissionRepo.hasPermission(user, requiredLevel),
                    requiredLevel,
                    reason: 'permission_denied',
                }
        }
    }

    async checkAccess(user, resource, action = 'read', context = {}) {
        const result = await this.checkAccessDetailed(user, resource, action, context)
        return result.allowed
    }

    async requireReadAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'read', {...context, fallbackLevel: 'blocked'})
        if (!result.allowed) {
            throw new PermissionDeniedError('read', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                i18nKey: result.i18nKey || null,
                i18nParams: result.i18nParams || null,
                block: result.block,
                message: result.message
            })
        }
    }

    async requireWriteAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'edit', {...context, fallbackLevel: 'everyone'})
        if (!result.allowed) {
            throw new PermissionDeniedError('edit', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                i18nKey: result.i18nKey || null,
                i18nParams: result.i18nParams || null,
                block: result.block,
                message: result.message
            })
        }
    }

    async requireMoveAccess(user, title, context = {}) {
        const result = await this.checkAccessDetailed(user, title, 'move', {...context, fallbackLevel: 'login'})
        if (!result.allowed) {
            throw new PermissionDeniedError('move', title, {
                acl: result.requiredLevel,
                reason: result.reason,
                i18nKey: result.i18nKey || null,
                i18nParams: result.i18nParams || null,
                block: result.block,
                message: result.message
            })
        }
    }

    async requireLoginAccess(user, context = {}) {
        const result = await this.checkAccessDetailed(user, null, 'read', {
            ...context,
            requiredLevel: 'login'
        })

        if (!result.allowed) {
            if (result.reason === 'login_required') {
                throw new AuthenticationRequiredError({
                    message: result.message,
                    i18nKey: result.i18nKey || 'loginneeded',
                    i18nParams: result.i18nParams || null
                })
            }

            throw new PermissionDeniedError('login', null, {
                acl: result.requiredLevel,
                reason: result.reason,
                i18nKey: result.i18nKey || null,
                i18nParams: result.i18nParams || null,
                block: result.block,
                message: result.message
            })
        }
    }

    async requirePermission(user, permission) {
        if (!user) throw new AuthenticationRequiredError()

        const hasPermission = await this.permissionRepo.hasPermission(user, permission)
        if (!hasPermission) {
            throw new PermissionDeniedError(permission, null, {
                acl: permission,
                i18nKey: 'deletepermneeded'
            })
        }
    }

    async hasPermission(user, permission) {
        // alias for repo.hasPermission
        // gentler version of requirePermission
        if (!user) return false
        return await this.permissionRepo.hasPermission(user, permission)
    }

    async grantPermission(adminUser, targetUser, permission) {
        await this.requirePermission(adminUser, 'grant')
        await this.permissionRepo.grantPermission(targetUser, permission, adminUser)
        logger.admin('Permission granted', adminUser, { target: targetUser, permission })
    }
}

module.exports = PermissionService
