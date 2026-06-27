import { describe, expect, test } from '@jest/globals'
import {
    CIDRtoRange,
    ipToSortKey,
    isValidCIDR,
    isValidIP,
    normalizeCIDR,
    normalizeIpAddress
} from './ipTools.js'

describe('normalizeIpAddress', () => {
    test('normalizes IPv4-mapped IPv6 to plain IPv4', () => {
        expect(normalizeIpAddress('::ffff:127.0.0.1')).toBe('127.0.0.1')
        expect(normalizeIpAddress('::ffff:7f00:1')).toBe('127.0.0.1')
    })

    test('normalizes bracketed IPv6 and forwarded lists', () => {
        expect(normalizeIpAddress('[::1]')).toBe('::1')
        expect(normalizeIpAddress(' 127.0.0.1, 10.0.0.1')).toBe('127.0.0.1')
    })

    test('throws for invalid or missing addresses', () => {
        expect(() => normalizeIpAddress('')).toThrow('Invalid IP address')
        expect(() => normalizeIpAddress('not-an-ip')).toThrow('Invalid IP address')
        expect(() => normalizeIpAddress(null)).toThrow('Invalid IP address')
    })
})

describe('ipToSortKey', () => {
    test('maps IPv4 addresses into the IPv4-mapped IPv6 range', () => {
        expect(ipToSortKey('127.0.0.1')).toBe('000000000000000000000000281472812449793')
        expect(ipToSortKey('::ffff:127.0.0.1')).toBe(ipToSortKey('127.0.0.1'))
    })

    test('uses native IPv6 numeric values', () => {
        expect(ipToSortKey('::1')).toBe('000000000000000000000000000000000000001')
        expect(ipToSortKey('2001:db8::1')).toBe('042540766411282592856903984951653826561')
    })

    test('always returns 39-character comparable strings', () => {
        expect(ipToSortKey('127.0.0.1')).toHaveLength(39)
        expect(ipToSortKey('2001:db8::1')).toHaveLength(39)
    })
})

describe('CIDRtoRange', () => {
    test('maps IPv4 CIDR ranges into the IPv4-mapped IPv6 range', () => {
        expect(CIDRtoRange('127.0.0.0/24')).toEqual({
            startIP: '000000000000000000000000281472812449792',
            endIP: '000000000000000000000000281472812450047'
        })
    })

    test('uses native IPv6 CIDR ranges', () => {
        expect(CIDRtoRange('2001:db8::/32')).toEqual({
            startIP: '042540766411282592856903984951653826560',
            endIP: '042540766490510755371168322545197776895'
        })
    })

    test('maps IPv4-mapped IPv6 CIDR ranges into the IPv4-mapped IPv6 range', () => {
        expect(CIDRtoRange('::ffff:127.0.0.1/128')).toEqual({
            startIP: ipToSortKey('127.0.0.1'),
            endIP: ipToSortKey('127.0.0.1')
        })
        expect(CIDRtoRange('::ffff:127.0.0.0/120')).toEqual(CIDRtoRange('127.0.0.0/24'))
    })
})

describe('normalizeCIDR', () => {
    test('canonicalizes equivalent IPv4 and IPv6 CIDR targets', () => {
        expect(normalizeCIDR('127.0.0.1/24')).toBe('127.0.0.0/24')
        expect(normalizeCIDR('0:0:0:0:0:0:0:1/128')).toBe('::1/128')
        expect(normalizeCIDR('2001:0db8::1/32')).toBe('2001:db8::/32')
    })

    test('canonicalizes IPv4-mapped IPv6 CIDR targets to IPv4 targets', () => {
        expect(normalizeCIDR('::ffff:127.0.0.1/128')).toBe('127.0.0.1/32')
        expect(normalizeCIDR('::ffff:127.0.0.0/120')).toBe('127.0.0.0/24')
    })
})

describe('IP validation', () => {
    test('distinguishes addresses from CIDR block targets', () => {
        expect(isValidIP('127.0.0.1')).toBe(true)
        expect(isValidIP('::1')).toBe(true)
        expect(isValidCIDR('127.0.0.1')).toBe(false)
        expect(isValidCIDR('127.0.0.0/24')).toBe(true)
        expect(isValidCIDR('2001:db8::/32')).toBe(true)
        expect(isValidCIDR('0:0:0:0:0:0:0:1/128')).toBe(true)
    })
})
