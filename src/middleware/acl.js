const paths = require('../utils/paths')

function checkAcl(options = {}) {
    const task = options.task || 'read'
    const fallback = options.fallback || 'everyone'
    const editErrorMsg = options.editErrorMsg === true
    const storeKey = options.storeKey || 'acl'
    const mode = options.mode || 'enforce'
    const errorMessageKey = options.errorMessageKey || `${task}_noacl`
    const errorReturnLink = options.errorReturnLink || '/'
    const errorReturnName = options.errorReturnName || 'mainpage'
    const errorStatus = options.errorStatus || 403
    const errorLang = options.errorLang || 'ko'

    return async (req, res, next) => {
        try {
            const title = req.params.name
            let protection = await req.app.locals.repositories.protections.findProtection(title, task)

            const acl = (protection === undefined || protection === null) ? fallback : protection.protectionLevel
            const satisfyACL = require(paths.resolve('pages', 'satisfyACL.js'))
            const result = await satisfyACL(req, res, [acl], global.db.perm, global.db.block, editErrorMsg)

            if (result === undefined) return

            const aclState = {
                acl,
                allowed: result === true,
                notification: result === true ? null : result
            }
            req[storeKey] = aclState

            if (mode === 'store' || aclState.allowed) {
                next()
                return
            }

            const errorMessage = (typeof aclState.notification === 'string' && aclState.notification.length > 0)
                ? aclState.notification
                : global.i18n.__(errorMessageKey, { acl })

            require(paths.resolve('error.js'))(
                req,
                res,
                null,
                errorMessage,
                errorReturnLink,
                global.i18n.__(errorReturnName),
                errorStatus,
                errorLang
            )
            return
        } catch (error) {
            next(error)
        }
    }
}

module.exports = { checkAcl }
