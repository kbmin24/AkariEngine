import { requirePermission } from './permission.js'

function verifyLoginStatus(req, res, next) {
    if (!req.session.username) {
        return res.redirect('/login')
    }

    next()
}

export { verifyLoginStatus, requirePermission }
