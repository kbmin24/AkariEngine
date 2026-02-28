import { AuthenticationRequiredError, PermissionDeniedError } from '../services/errors.js'

function buildAccessError(req, error, options = {}) {
    // error from PermissionService is quite generic; transforms error to something that makes more sense
    const acl = (error && error.details && error.details.acl) || options.acl || 'everyone'

    if (error instanceof AuthenticationRequiredError) {
        return new AuthenticationRequiredError({
            message: 'Login Required.', //fallback
            returnLink: options.authReturnLink || '/login',
            returnName: options.authReturnName || 'loginpage',
            i18nKey: 'loginneeded',
            lang: options.lang || 'ko'
        })
    }

    if (error instanceof PermissionDeniedError) {
        const detailMessage = error.details && error.details.message // honestly not sure whether this is even required
        const detailI18nKey = error.details && error.details.i18nKey
        const detailI18nParams = error.details && error.details.i18nParams
        const denyReason = error.details && error.details.reason
        const isBlockDeny = denyReason === 'user_block' || denyReason === 'ip_block'

        const message = detailMessage
            || options.noAclMessage

        const i18nKey = isBlockDeny
            ? detailI18nKey
            : (options.noAclMessageKey || detailI18nKey)

        const i18nParams = isBlockDeny
            ? (detailI18nParams || { acl })
            : (options.noAclMessageKey ? { acl } : (detailI18nParams || { acl }))

        return new PermissionDeniedError(error.action || 'unknown', error.resource || null, {
            ...(error.details || {}),
            message,
            i18nKey,
            i18nParams,
            returnLink: options.permissionReturnLink || '/',
            returnName: options.permissionReturnName || 'mainpage',
            lang: options.lang || 'ko'
        })
    }

    return error
}

function resolveActionMethod(action) {
    switch (action) {
    case 'read':
        return 'requireReadAccess'
    case 'edit':
    case 'write':
        return 'requireWriteAccess'
    case 'move':
        return 'requireMoveAccess'
    default:
        return null
    }
}

function requirePermission(permission, options = {}) {
    const allowIPUser = options.allowIPUser === true
    const mode = options.mode || 'enforce'
    const storeKey = options.storeKey || 'permissionAccess'

    return async (req, res, next) => {
        try {
            const username = req.session ? req.session.username : undefined
            if (!username && !allowIPUser) {
                throw new AuthenticationRequiredError()
            }

            if (username) {
                const services = req.app.locals.services
                await services.permission.requirePermission(username, permission)
            }

            req[storeKey] = { allowed: true, permission }
            next()
        } catch (error) {
            const mapped = buildAccessError(req, error, options)
            if (mode === 'store' && (mapped instanceof AuthenticationRequiredError || mapped instanceof PermissionDeniedError)) {
                req[storeKey] = {
                    allowed: false,
                    permission,
                    error: mapped
                }
                next()
                return
            }
            next(mapped)
        }
    }
}

function requirePageAccess(action, options = {}) {
    const titleParam = options.titleParam || 'name'
    const revisionQueryKey = options.revisionQueryKey || 'rev'
    const revisionBodyKey = options.revisionBodyKey || 'rev'
    const revisionQueryKeys = Array.isArray(options.revisionQueryKeys)
        ? options.revisionQueryKeys
        : null
    const revisionBodyKeys = Array.isArray(options.revisionBodyKeys)
        ? options.revisionBodyKeys
        : null
    const method = resolveActionMethod(action)
    const mode = options.mode || 'enforce' // store or enforce
    const storeKey = options.storeKey || 'pageAccess'

    if (!method) {
        throw new Error(`Unsupported page access action: ${action}`)
    }

    return async (req, res, next) => {
        try {
            const title = req.params ? req.params[titleParam] : undefined
            const username = req.session ? req.session.username : undefined
            const services = req.app.locals.services

            let revisions = []
            if (action === 'read') {
                if (revisionQueryKeys && revisionQueryKeys.length > 0) {
                    revisions = revisions.concat(revisionQueryKeys.map((key) => req.query && req.query[key]))
                } else {
                    revisions.push(req.query && req.query[revisionQueryKey])
                }

                if (revisionBodyKeys && revisionBodyKeys.length > 0) {
                    revisions = revisions.concat(revisionBodyKeys.map((key) => req.body && req.body[key]))
                } else {
                    revisions.push(req.body && req.body[revisionBodyKey])
                }

                // find sane values only
                revisions = [...new Set(revisions.filter((value) => value !== undefined && value !== null && value !== ''))]
            }

            if (action === 'read' && revisions.length > 0) {
                for (const revision of revisions) {
                    await services.permission[method](username, title, {
                        ipAddress: req.ipAddress,
                        revision
                    })
                }
            } else {
                await services.permission[method](username, title, {
                    ipAddress: req.ipAddress,
                    revision: action === 'read'
                        ? ((req.query && req.query[revisionQueryKey] !== undefined)
                            ? req.query[revisionQueryKey]
                            : (req.body ? req.body[revisionBodyKey] : undefined))
                        : undefined
                })
            }

            req[storeKey] = { allowed: true, action, title, revisions }
            next()
        } catch (error) {
            const mapped = buildAccessError(req, error, {
                ...options,
                noAclMessageKey: options.noAclMessageKey || `${action}_noacl`
            })

            if (mode === 'store' && (mapped instanceof AuthenticationRequiredError || mapped instanceof PermissionDeniedError)) {
                req[storeKey] = {
                    allowed: false,
                    action,
                    title: req.params ? req.params[titleParam] : undefined,
                    revisions: action === 'read'
                        ? [...new Set([
                            ...(revisionQueryKeys && revisionQueryKeys.length > 0
                                ? revisionQueryKeys.map((key) => req.query && req.query[key])
                                : [req.query && req.query[revisionQueryKey]]),
                            ...(revisionBodyKeys && revisionBodyKeys.length > 0
                                ? revisionBodyKeys.map((key) => req.body && req.body[key])
                                : [req.body && req.body[revisionBodyKey]])
                        ].filter((value) => value !== undefined && value !== null && value !== ''))]
                        : [],
                    error: mapped
                }
                next()
                return
            }

            next(mapped)
        }
    }
}

function requireLogin(options = {}) {
    // requires 'login' ACL, that is, logged in & not blocked.
    const mode = options.mode || 'enforce'
    const storeKey = options.storeKey || 'loginAccess'

    return async (req, res, next) => {
        try {
            const username = req.session ? req.session.username : undefined
            const services = req.app.locals.services

            await services.permission.requireLoginAccess(username, {
                ipAddress: req.ipAddress
            })

            req[storeKey] = { allowed: true }
            next()
        } catch (error) {
            const mapped = buildAccessError(req, error, options)

            if (mode === 'store' && (mapped instanceof AuthenticationRequiredError || mapped instanceof PermissionDeniedError)) {
                req[storeKey] = {
                    allowed: false,
                    error: mapped
                }
                next()
                return
            }

            next(mapped)
        }
    }
}

function createRequireEveryoneMiddleware(options = {}) {
    // requires 'everyone' ACL i.e. pass IP/user block checks.
    const mode = options.mode || 'enforce'
    const storeKey = options.storeKey || 'everyoneAccess'

    return async (req, res, next) => {
        try {
            const username = req.session ? req.session.username : undefined
            const services = req.app.locals.services

            const result = await services.permission.checkAccessDetailed(username, null, 'read', {
                ipAddress: req.ipAddress,
                requiredLevel: 'everyone'
            })

            if (!result.allowed) {
                throw new PermissionDeniedError('read', null, {
                    acl: result.requiredLevel,
                    reason: result.reason,
                    i18nKey: result.i18nKey || null,
                    i18nParams: result.i18nParams || null,
                    block: result.block,
                    message: result.message
                })
            }

            req[storeKey] = { allowed: true }
            next()
        } catch (error) {
            const mapped = buildAccessError(req, error, options)

            if (mode === 'store' && (mapped instanceof AuthenticationRequiredError || mapped instanceof PermissionDeniedError)) {
                req[storeKey] = {
                    allowed: false,
                    error: mapped
                }
                next()
                return
            }

            next(mapped)
        }
    }
}

function requireEveryone(options, res, next) {
    if (typeof next === 'function') {
        return createRequireEveryoneMiddleware({})(options, res, next)
    }

    return createRequireEveryoneMiddleware(options || {})
}

export {
    requirePermission,
    requirePageAccess,
    requireLogin,
    requireEveryone
}
