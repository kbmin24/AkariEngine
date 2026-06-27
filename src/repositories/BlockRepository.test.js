import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { Sequelize } from 'sequelize'
import blockFactory from '../models/block.model.js'
import { CIDRtoRange, ipToSortKey } from '../utils/ipTools.js'
import BlockRepository from './BlockRepository.js'

let sequelize
let repository

beforeEach(async () => {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    })
    const block = blockFactory(sequelize)
    repository = new BlockRepository(block)
    await sequelize.sync({ force: true })
})

afterEach(async () => {
    await sequelize.close()
})

describe('BlockRepository.findIpBlocksContaining', () => {
    test('finds matching IPv4 and IPv6 blocks using string range comparison', async () => {
        const ipv4Range = CIDRtoRange('127.0.0.0/24')
        const ipv6Range = CIDRtoRange('2001:db8::/32')

        await repository.createIpBlock({
            target: '127.0.0.0/24',
            startIP: ipv4Range.startIP,
            endIP: ipv4Range.endIP,
            isForever: true,
            doneBy: 'Admin'
        })
        await repository.createIpBlock({
            target: '2001:db8::/32',
            startIP: ipv6Range.startIP,
            endIP: ipv6Range.endIP,
            isForever: true,
            doneBy: 'Admin'
        })
        await repository.createUserBlock({
            target: 'Alice',
            isForever: true,
            doneBy: 'Admin'
        })

        const ipv4Matches = await repository.findIpBlocksContaining(ipToSortKey('127.0.0.1'))
        const mappedIpv4Matches = await repository.findIpBlocksContaining(ipToSortKey('::ffff:127.0.0.1'))
        const ipv6Matches = await repository.findIpBlocksContaining(ipToSortKey('2001:db8::1'))
        const loopbackMatches = await repository.findIpBlocksContaining(ipToSortKey('::1'))

        expect(ipv4Matches.map((block) => block.target)).toEqual(['127.0.0.0/24'])
        expect(mappedIpv4Matches.map((block) => block.target)).toEqual(['127.0.0.0/24'])
        expect(ipv6Matches.map((block) => block.target)).toEqual(['2001:db8::/32'])
        expect(loopbackMatches).toHaveLength(0)
    })
})
