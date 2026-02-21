let IPCIDR

let { Address4 } = require('ip-address')

async function init() {
    if (!IPCIDR) {
        const mod = await import('ip-cidr');
        IPCIDR = mod.default;
    }
    return IPCIDR;
}

async function CIDRtoRange(ip) {
    const cidr = new IPCIDR(ip)
    return { startIP: cidr.start(({ type: "bigInteger" })), endIP: cidr.end(({ type: "bigInteger" })) }
}

async function isValidIP(ip) {
    const IPCIDR = await init()
    return IPCIDR.isValidAddress(ip)
}

async function iptoBigInt(ip) {
    const address = new Address4(ip)
    if (!address.isCorrect()) throw new Error(`Invalid IP address: ${ip}`)
    return address.bigInteger()
}

module.exports = {
    CIDRtoRange,
    isValidIP,
    iptoBigInt
}
