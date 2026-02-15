const {
    AuthenticationRequiredError,
    PermissionDeniedError
} = require('../services/errors')

function buildAccessError(req, error, options = {}) {
    const acl = (error && error.details && error.details.acl) || options.acl || 'everyone'

    if (error instanceof AuthenticationRequiredError) {
        return new AuthenticationRequiredError({
            message: global.i18n.__('loginneeded'),
            returnLink: options.authReturnLink || '/login',
            returnName: options.authReturnName || 'loginpage',
            lang: options.lang || 'ko'
        })
    }

    if (error instanceof PermissionDeniedError) {
        const detailMessage = error.details && error.details.message
        const message = detailMessage
            || options.noAclMessage
            || global.i18n.__(options.noAclMessageKey || 'edit_noacl', { acl })
        return new PermissionDeniedError(error.action || 'unknown', error.resource || null, {
            ...(error.details || {}),
            message,
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
            await services.permission[method](username, title, {
                ipAddress: req.ipAddress
            })
            req[storeKey] = { allowed: true, action, title }
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
                    error: mapped
                }
                next()
                return
            }

            next(mapped)
        }
    }
}

module.exports = {
    requirePermission,
    requirePageAccess
}
