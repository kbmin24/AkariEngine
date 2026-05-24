import renderError from '../../utils/error.js'
import logger from '../../utils/logger.js'
export default async (req, res) => {
    let username = req.body.id
    let exists = await req.app.locals.services.user.exists(username)
    if (!exists) {
        logger.warn('Login error (no such user)', { id: req.body.id })
        renderError(req, res, {
            description: res.__('nosuchuser'),
            returnLink: '/login',
            returnName: res.__('loginpage'),
            statusCode: 401
        })
        return
    }

    if (await req.app.locals.services.user.verifyPassword(username, req.body.password)) {
        req.session.username = username
        await req.app.locals.services.loginHistory.createLoginRecord(username, req.ipAddress)
        res.redirect('/')
    } else {
        logger.warn('Login error (incorrect password)', { id: req.body.id })
        renderError(req, res, {
            description: res.__('invalidpassword'),
            returnLink: '/login',
            returnName: res.__('loginpage'),
            statusCode: 401
        })
    }
}