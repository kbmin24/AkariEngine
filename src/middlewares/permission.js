import { AuthenticationRequiredError, PermissionDeniedError } from '../services/errors.js'
import { BACK_LINK, LOGIN_LINK } from '../utils/httpHelper.js'

function buildAccessError(req, error, options = {}) {
    // error from PermissionService is quite generic; transforms error to something that makes more sense
    const acl = (error && error.details && error.details.acl) || options.acl || 'everyone'

    if (error instanceof AuthenticationRequiredError) {
        return new AuthenticationRequiredError({
            message: 'Login Required.', //fallback
            returnLink: LOGIN_LINK,
            returnName: 'loginpage',
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
            returnLink: BACK_LINK,
            returnName: 'previousPage',
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

/**
 * Express middleware factory that enforces page-level access control.
 *
 * Resolves the page title from `req.params[titleParam]` and the current user
 * from `req.session.username`, then delegates to the appropriate
 * `PermissionService` method (`requireReadAccess`, `requireWriteAccess`, or
 * `requireMoveAccess`).
 *
 * For `'read'` actions, every revision referenced in the request (query string)
 * is checked individually so that per-revision ACLs are respected.
 *
 * On success the result is stored in `req[storeKey]`:
 * ```js
 * { allowed: true, action, title, revisions }
 * ```
 *
 * On failure behaviour depends on `options.mode`:
 * - `'enforce'` (default): calls `next(error)` with a mapped
 *   `AuthenticationRequiredError` or `PermissionDeniedError`.
 * - `'store'`: stores the error in `req[storeKey]` and calls `next()`, letting
 *   the route handler decide what to do.
 * 
 * Requires req.params.name to be defined.
 *
 * @param {'read'|'edit'|'write'|'move'} action - The access action to check.
 * @param {object} [options]
 * @param {string[]} [options.revisionQueryKeys] - `req.query` keys for multiple revisions.
 * @param {'enforce'|'store'} [options.mode='enforce'] - How to handle access errors.
 * @param {string} [options.storeKey='pageAccess'] - `req` property where the result is stored.
 * @param {string} [options.noAclMessageKey] - i18n key for the permission-denied message (defaults to `'<action>_noacl'`).
 * @param {string} [options.lang='ko'] - Language code forwarded to error objects.
 * @returns {import('express').RequestHandler} Express middleware.
 */
function requirePageAccess(action, options = {}) {
    const titleParam = options.titleParam || 'name'
    const revisionQueryKeys = Array.isArray(options.revisionQueryKeys)
        ? options.revisionQueryKeys
        : null
    const method = resolveActionMethod(action)
    const mode = options.mode || 'enforce' // store or enforce
    const storeKey = options.storeKey || 'pageAccess'

    if (!method) {
        throw new Error(`Unsupported page access action: ${action}`)
    }

    return async (req, res, next) => {
        // collect r's to look for
        let revisions = []
        if (action === 'read') {
            if (revisionQueryKeys && revisionQueryKeys.length > 0) {
                revisions = revisions.concat(revisionQueryKeys.map((key) => req.query && req.query[key]))

                // find sane values only
                revisions = [...new Set(revisions.filter(Boolean))]
            }

        }

        try {
            const title = req.params.name
            const username = req.session ? req.session.username : undefined
            const services = req.app.locals.services

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
                if (action === 'read' && revisionQueryKeys && revisionQueryKeys.length > 0) {

                    req[storeKey] = {
                        allowed: false,
                        action,
                        title: req.params ? req.params[titleParam] : undefined,
                        revisions: action === 'read'
                            ? [...new Set([
                                ...(revisionQueryKeys && revisionQueryKeys.length > 0
                                    ? revisionQueryKeys.map((key) => req.query && req.query[key])
                                    : undefined),
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
