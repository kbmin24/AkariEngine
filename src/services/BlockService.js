import dateandtime from 'date-and-time'
import { ValidationError, PermissionDeniedError, AuthenticationRequiredError } from './errors.js'
import { CIDRtoRange, isValidCIDR, ipToSortKey, normalizeCIDR } from '../utils/ipTools.js'

class BlockService {
    constructor(blockRepo, userRepo, permissionRepo) {
        this.blockRepo = blockRepo
        this.userRepo = userRepo
        this.permissionRepo = permissionRepo
    }

    normalizeDuration(blockFor) {
        if (blockFor === 'unblock') return { mode: 'unblock' }
        if (blockFor === 'forever') return { mode: 'forever' }

        const seconds = Number(blockFor)
        if (!Number.isFinite(seconds) || seconds < 0) {
            throw new ValidationError({
                message: 'Block period must be unblock, forever or an integer.',
                code: 'INVALID_BLOCK_PERIOD',
                statusCode: 400
            })
        }

        return {
            mode: 'until',
            until: new Date(Date.now() + (seconds * 1000))
        }
    }

    async requireBlockPermission(actor) {
        if (!actor) {
            throw new AuthenticationRequiredError({
                message: 'Authentication required'
            })
        }

        const hasPermission = await this.permissionRepo.hasPermission(actor, 'block')
        if (!hasPermission) {
            throw new PermissionDeniedError('block', null, {
                acl: 'block',
                message: 'You do not have a block permission'
            })
        }
    }

    async findIPBlock(ipAddress) {
        await this.blockRepo.clearExpiredBlocks()

        let ipAsNumber
        try {
            ipAsNumber = ipToSortKey(ipAddress)
        } catch (_error) {
            return null
        }
        if (ipAsNumber === null || ipAsNumber === undefined) return null

        const matches = await this.blockRepo.findIpBlocksContaining(ipAsNumber)
        if (!matches || matches.length === 0) return null

        const disallowLogin = matches.find((entry) => entry && entry.allowLogin === false)
        return disallowLogin || matches[0]
    }

    async blockUser({ actor, target, blockFor, comment = '' }) {
        await this.blockRepo.clearExpiredBlocks()
        await this.requireBlockPermission(actor)

        const user = await this.userRepo.findByUsername(target)
        if (!user) {
            throw new ValidationError({
                message: 'No such user.',
                code: 'BLOCK_USER_NOT_FOUND',
                statusCode: 400
            })
        }

        const duration = this.normalizeDuration(blockFor)
        const existing = await this.blockRepo.findBlock(target, 'user')

        if (duration.mode === 'unblock') {
            if (!existing) {
                throw new ValidationError({
                    message: 'The user currently is not blocked.',
                    code: 'USER_NOT_BLOCKED',
                    statusCode: 400
                })
            }

            await this.blockRepo.deleteBlock(target, 'user')
            return { description: `unblocked ${target} - ${comment}` }
        }

        if (existing) {
            throw new ValidationError({
                message: 'The user is already blocked. Please unblock the user first.',
                code: 'USER_ALREADY_BLOCKED',
                statusCode: 400
            })
        }

        if (duration.mode === 'forever') {
            await this.blockRepo.createUserBlock({
                target,
                isForever: true,
                doneBy: actor,
                comment
            })

            return { description: `blocked ${target} forever - ${comment}` }
        }

        await this.blockRepo.createUserBlock({
            target,
            isForever: false,
            until: duration.until,
            doneBy: actor,
            comment
        })

        return {
            description: `blocked ${target} until ${dateandtime.format(duration.until, global.dtFormat)} - ${comment}`
        }
    }

    async blockIp({ actor, target, blockFor, allowLogin = false, comment = '' }) {
        await this.blockRepo.clearExpiredBlocks()
        await this.requireBlockPermission(actor)

        if (!isValidCIDR(target)) {
            throw new ValidationError({
                message: 'CIDR given is invalid.',
                code: 'INVALID_CIDR',
                statusCode: 400
            })
        }

        const normalizedTarget = normalizeCIDR(target)
        const duration = this.normalizeDuration(blockFor)
        const existing = await this.blockRepo.findBlock(normalizedTarget, 'ip')

        if (duration.mode === 'unblock') {
            if (!existing) {
                throw new ValidationError({
                    message: 'The IP currently is not blocked.',
                    code: 'IP_NOT_BLOCKED',
                    statusCode: 400
                })
            }

            await this.blockRepo.deleteBlock(normalizedTarget, 'ip')
            return { description: `unblocked ${normalizedTarget} - ${comment}` }
        }

        if (existing) {
            throw new ValidationError({
                message: 'The IP is already blocked. Please unblock the IP first.',
                code: 'IP_ALREADY_BLOCKED',
                statusCode: 400
            })
        }

        const { startIP, endIP } = CIDRtoRange(normalizedTarget)

        if (duration.mode === 'forever') {
            await this.blockRepo.createIpBlock({
                target: normalizedTarget,
                startIP,
                endIP,
                isForever: true,
                doneBy: actor,
                allowLogin,
                comment
            })

            return {
                description: `blocked ${normalizedTarget} forever (Login: ${allowLogin ? 'Allow' : 'Disallow'}) - ${comment}`
            }
        }

        await this.blockRepo.createIpBlock({
            target: normalizedTarget,
            startIP,
            endIP,
            isForever: false,
            until: duration.until,
            doneBy: actor,
            allowLogin,
            comment
        })

        return {
            description: `blocked ${normalizedTarget} until ${dateandtime.format(duration.until, global.dtFormat)} (Login: ${allowLogin ? 'Allow' : 'Disallow'}) - ${comment}`
        }
    }
}

export default BlockService
