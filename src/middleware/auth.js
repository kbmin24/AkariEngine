const { requirePermission } = require('./permission')

function verifyLoginStatus(req, res, next) {
    if (!req.session.username) {
        return res.redirect('/login')
    }

    next()
}

module.exports = { verifyLoginStatus, requirePermission }
