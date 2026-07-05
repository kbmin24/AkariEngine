import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const { Address4, Address6 } = require('ip-address')

const IPV4_MAPPED_IPV6_OFFSET = 281470681743360n
const SORT_KEY_LENGTH = 39
const IPV4_BITS = 32n
const IPV6_BITS = 128n

function toBigInt(value) {
    return BigInt(value.toString())
}

function toSortKey(value) {
    return value.toString().padStart(SORT_KEY_LENGTH, '0')
}

function parseIPv4(ip) {
    try {
        const address = new Address4(ip)
        return address.isCorrect() ? address : null
    } catch (_error) {
        return null
    }
}

function parseIPv6(ip) {
    try {
        const address = new Address6(ip)
        return address
    } catch (_error) {
        return null
    }
}

function cleanIpInput(ip) {
    if (typeof ip !== 'string') {
        throw new Error(`Invalid IP address: ${ip}`)
    }

    const value = ip.split(',')[0].trim().replace(/^\[(.+)\]$/, '$1')
    if (!value) throw new Error('Invalid IP address: empty value')

    return value
}

function normalizeIpAddress(ip) {
    const value = cleanIpInput(ip)

    const address4 = parseIPv4(value)
    if (address4) return address4.correctForm()

    const address6 = parseIPv6(value)
    if (!address6) {
        throw new Error(`Invalid IP address: ${ip}`)
    }

    if (isIPv4MappedAddress(address6)) return address6.to4().correctForm()

    return address6.correctForm()
}

function isIPv4MappedAddress(address6) {
    return address6.parsedAddress.slice(0, 5).every((part) => part === '0') &&
        address6.parsedAddress[5].toLowerCase() === 'ffff'
}

function ipv4ToMappedSortKey(address4) {
    return toSortKey(IPV4_MAPPED_IPV6_OFFSET + toBigInt(address4.bigInteger()))
}

function rangeToSortKeys(addressValue, prefix, bitLength, offset = 0n) {
    const hostBits = bitLength - BigInt(prefix)
    const blockSize = 1n << hostBits
    const start = (addressValue / blockSize) * blockSize
    const end = start + blockSize - 1n

    return {
        startIP: toSortKey(offset + start),
        endIP: toSortKey(offset + end)
    }
}

function parseCIDR(cidr) {
    if (typeof cidr !== 'string') {
        throw new Error(`Invalid CIDR: ${cidr}`)
    }

    const parts = cidr.trim().split('/')
    if (parts.length !== 2) {
        throw new Error(`Invalid CIDR: ${cidr}`)
    }

    const [address, prefixText] = parts
    if (!/^\d+$/.test(prefixText)) {
        throw new Error(`Invalid CIDR: ${cidr}`)
    }

    const prefix = Number(prefixText)
    const address4 = parseIPv4(address)
    if (address4) {
        if (prefix < 0 || prefix > 32) throw new Error(`Invalid CIDR: ${cidr}`)
        return { family: 4, address: address4, prefix }
    }

    const address6 = parseIPv6(address)
    if (address6) {
        if (prefix < 0 || prefix > 128) throw new Error(`Invalid CIDR: ${cidr}`)
        return { family: 6, address: address6, prefix }
    }

    throw new Error(`Invalid CIDR: ${cidr}`)
}

function ipv4FromNumber(value) {
    return [
        Number((value >> 24n) & 255n),
        Number((value >> 16n) & 255n),
        Number((value >> 8n) & 255n),
        Number(value & 255n)
    ].join('.')
}

function normalizeCIDR(cidr) {
    const parsed = parseCIDR(cidr)
    if (parsed.family === 4) {
        const addressValue = toBigInt(parsed.address.bigInteger())
        const hostBits = IPV4_BITS - BigInt(parsed.prefix)
        const start = (addressValue / (1n << hostBits)) * (1n << hostBits)
        return `${ipv4FromNumber(start)}/${parsed.prefix}`
    }

    if (isIPv4MappedAddress(parsed.address) && parsed.prefix >= 96) {
        const ipv4Prefix = parsed.prefix - 96
        const addressValue = toBigInt(parsed.address.to4().bigInteger())
        const hostBits = IPV4_BITS - BigInt(ipv4Prefix)
        const start = (addressValue / (1n << hostBits)) * (1n << hostBits)
        return `${ipv4FromNumber(start)}/${ipv4Prefix}`
    }

    const addressValue = toBigInt(parsed.address.bigInteger())
    const hostBits = IPV6_BITS - BigInt(parsed.prefix)
    const start = (addressValue / (1n << hostBits)) * (1n << hostBits)
    return `${Address6.fromBigInteger(start).correctForm()}/${parsed.prefix}`
}

function CIDRtoRange(cidr) {
    const parsed = parseCIDR(cidr)
    if (parsed.family === 4) {
        return rangeToSortKeys(
            toBigInt(parsed.address.bigInteger()),
            parsed.prefix,
            IPV4_BITS,
            IPV4_MAPPED_IPV6_OFFSET
        )
    }

    if (isIPv4MappedAddress(parsed.address) && parsed.prefix >= 96) {
        return rangeToSortKeys(
            toBigInt(parsed.address.to4().bigInteger()),
            parsed.prefix - 96,
            IPV4_BITS,
            IPV4_MAPPED_IPV6_OFFSET
        )
    }

    return rangeToSortKeys(toBigInt(parsed.address.bigInteger()), parsed.prefix, IPV6_BITS)
}

function isValidIP(ip) {
    try {
        const value = cleanIpInput(ip)
        return parseIPv4(value) !== null || parseIPv6(value) !== null
    } catch (_error) {
        return false
    }
}

function isValidCIDR(cidr) {
    try {
        parseCIDR(cidr)
        return true
    } catch (_error) {
        return false
    }
}

function isIPv4CIDR(cidr) {
    if (typeof cidr !== 'string') return false

    const [address] = cidr.split('/')
    return parseIPv4(address) !== null
}

function ipToSortKey(ip) {
    const normalized = normalizeIpAddress(ip)

    const address4 = parseIPv4(normalized)
    if (address4) return ipv4ToMappedSortKey(address4)

    const address6 = parseIPv6(normalized)
    if (!address6) throw new Error(`Invalid IP address: ${ip}`)

    return toSortKey(toBigInt(address6.bigInteger()))
}

export {
    CIDRtoRange,
    isValidCIDR,
    isValidIP,
    normalizeCIDR,
    normalizeIpAddress,
    ipToSortKey
}
