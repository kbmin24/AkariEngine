import { rateLimit } from 'express-rate-limit'

const createPathSkipper = ({ skipPaths = [], skipExactPaths = [] } = {}) => {
    const exactPaths = new Set(skipExactPaths)

    return req => (
        skipPaths.some(prefix => req.path.startsWith(prefix)) ||
        exactPaths.has(req.path)
    )
}

export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    limit = 15 * 60,
    skipPaths,
    skipExactPaths,
    skip,
    ...options
} = {}) => {
    const skipRequest = skip ?? createPathSkipper({ skipPaths, skipExactPaths })

    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
        skip: skipRequest,
        ...options
    })
}
