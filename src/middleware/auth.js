function verifyLoginStatus(req, res, next) {
    if (!req.session.username) {
        return res.redirect('/login')
    }

    next()
}

function requirePermission(permission) {
    return async (req, res, next) => {
        if (!req.session.username) {
            // TODO throw an error so that errorHandler can catch it
            return res.status(401).json({ error: 'Authentication required' })
        }

        try {
            const services = req.app.locals.services
            await services.permission.requirePermission(req.session.username, permission)
            next()
        } catch (error) {
            next(error)
        }
    }
}

module.exports = { verifyLoginStatus, requirePermission }
