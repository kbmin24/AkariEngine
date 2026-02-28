import IPCIDR from 'ip-cidr'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const { Address4 } = require('ip-address')

function CIDRtoRange(ip) {
    const cidr = new IPCIDR(ip)
    return { startIP: cidr.start(({ type: "bigInteger" })), endIP: cidr.end(({ type: "bigInteger" })) }
}

function isValidIP(ip) {
    return IPCIDR.isValidAddress(ip)
}

function iptoBigInt(ip) {
    const address = new Address4(ip)
    if (!address.isCorrect()) throw new Error(`Invalid IP address: ${ip}`)
    return address.bigInteger()
}

export {
    CIDRtoRange,
    isValidIP,
    iptoBigInt
}
