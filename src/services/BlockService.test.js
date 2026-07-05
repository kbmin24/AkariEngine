import { describe, expect, jest, test } from '@jest/globals'
import BlockService from './BlockService.js'
import { CIDRtoRange, ipToSortKey } from '../utils/ipTools.js'

const createService = ({
    ipMatches = [],
    existingBlock = null,
    hasBlockPermission = true
} = {}) => {
    const blockRepo = {
        clearExpiredBlocks: jest.fn().mockResolvedValue(undefined),
        findIpBlocksContaining: jest.fn().mockResolvedValue(ipMatches),
        findBlock: jest.fn().mockResolvedValue(existingBlock),
        deleteBlock: jest.fn().mockResolvedValue(1),
        createIpBlock: jest.fn().mockResolvedValue(undefined)
    }
    const userRepo = {
        findByUsername: jest.fn()
    }
    const permissionRepo = {
        hasPermission: jest.fn().mockResolvedValue(hasBlockPermission)
    }

    return {
        service: new BlockService(blockRepo, userRepo, permissionRepo),
        blockRepo,
        permissionRepo
    }
}

describe('BlockService.findIPBlock', () => {
    test('queries IP blocks using mapped 39-character sort keys', async () => {
        const match = { target: '127.0.0.0/24', allowLogin: false }
        const { service, blockRepo } = createService({ ipMatches: [match] })

        await expect(service.findIPBlock('::ffff:127.0.0.1')).resolves.toBe(match)

        expect(blockRepo.findIpBlocksContaining).toHaveBeenCalledWith(ipToSortKey('127.0.0.1'))
    })

    test('returns null for invalid request IP values', async () => {
        const { service, blockRepo } = createService()

        await expect(service.findIPBlock('not-an-ip')).resolves.toBeNull()

        expect(blockRepo.findIpBlocksContaining).not.toHaveBeenCalled()
    })

    test('prefers a disallow-login match over allow-login matches', async () => {
        const allowLogin = { target: '127.0.0.0/24', allowLogin: true }
        const disallowLogin = { target: '127.0.0.1/32', allowLogin: false }
        const { service } = createService({ ipMatches: [allowLogin, disallowLogin] })

        await expect(service.findIPBlock('127.0.0.1')).resolves.toBe(disallowLogin)
    })
})

describe('BlockService.blockIp', () => {
    test('creates IPv6 blocks with 39-character range endpoints', async () => {
        const { service, blockRepo, permissionRepo } = createService()
        const expectedRange = CIDRtoRange('2001:db8::/32')

        const result = await service.blockIp({
            actor: 'Admin',
            target: '2001:0db8::1/32',
            blockFor: 'forever',
            allowLogin: true,
            comment: 'test block'
        })

        expect(permissionRepo.hasPermission).toHaveBeenCalledWith('Admin', 'block')
        expect(blockRepo.findBlock).toHaveBeenCalledWith('2001:db8::/32', 'ip')
        expect(blockRepo.createIpBlock).toHaveBeenCalledWith(expect.objectContaining({
            target: '2001:db8::/32',
            startIP: expectedRange.startIP,
            endIP: expectedRange.endIP,
            isForever: true,
            doneBy: 'Admin',
            allowLogin: true,
            comment: 'test block'
        }))
        expect(result.description).toContain('blocked 2001:db8::/32 forever')
        expect(expectedRange.startIP).toHaveLength(39)
        expect(expectedRange.endIP).toHaveLength(39)
    })

    test('creates IPv4-mapped IPv6 CIDR blocks as canonical IPv4 blocks', async () => {
        const { service, blockRepo } = createService()

        await service.blockIp({
            actor: 'Admin',
            target: '::ffff:127.0.0.1/128',
            blockFor: 'forever'
        })

        expect(blockRepo.findBlock).toHaveBeenCalledWith('127.0.0.1/32', 'ip')
        expect(blockRepo.createIpBlock).toHaveBeenCalledWith(expect.objectContaining({
            target: '127.0.0.1/32',
            startIP: ipToSortKey('127.0.0.1'),
            endIP: ipToSortKey('127.0.0.1')
        }))
    })

    test('creates IPv4 CIDR blocks in the IPv4-mapped IPv6 range', async () => {
        const { service, blockRepo } = createService()

        await service.blockIp({
            actor: 'Admin',
            target: '127.0.0.0/24',
            blockFor: 'forever'
        })

        expect(blockRepo.createIpBlock).toHaveBeenCalledWith(expect.objectContaining({
            startIP: '000000000000000000000000281472812449792',
            endIP: '000000000000000000000000281472812450047'
        }))
    })

    test('uses canonical CIDR target for unblock lookup and delete', async () => {
        const existingBlock = { target: '::1/128' }
        const { service, blockRepo } = createService({ existingBlock })

        await service.blockIp({
            actor: 'Admin',
            target: '0:0:0:0:0:0:0:1/128',
            blockFor: 'unblock'
        })

        expect(blockRepo.findBlock).toHaveBeenCalledWith('::1/128', 'ip')
        expect(blockRepo.deleteBlock).toHaveBeenCalledWith('::1/128', 'ip')
    })

    test('rejects equivalent existing CIDR blocks by canonical target', async () => {
        const existingBlock = { target: '2001:db8::/32' }
        const { service, blockRepo } = createService({ existingBlock })

        await expect(service.blockIp({
            actor: 'Admin',
            target: '2001:0db8::1/32',
            blockFor: 'forever'
        })).rejects.toMatchObject({ code: 'IP_ALREADY_BLOCKED' })

        expect(blockRepo.findBlock).toHaveBeenCalledWith('2001:db8::/32', 'ip')
        expect(blockRepo.createIpBlock).not.toHaveBeenCalled()
    })

    test('rejects bare IP addresses as invalid CIDR block targets', async () => {
        const { service, blockRepo } = createService()

        await expect(service.blockIp({
            actor: 'Admin',
            target: '127.0.0.1',
            blockFor: 'forever'
        })).rejects.toMatchObject({ code: 'INVALID_CIDR' })

        expect(blockRepo.createIpBlock).not.toHaveBeenCalled()
    })
})
