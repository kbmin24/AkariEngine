const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
    CaptchaError
} = require('../services/errors')

function errorHandler(err, req, res, next) {
    if (err && err.code) {
        return next(err)
    }

    logger.error('Request error', err)

    const localizedMessage = (err && typeof err.getLocalizedMessage === 'function')
        ? err.getLocalizedMessage(req)
        : err.message

    if (err instanceof PermissionDeniedError) {
        return require(paths.resolve('error.js'))(
            req,
            res,
            null,
            localizedMessage,
            err.returnLink || '/',
            global.i18n.__(err.returnName || 'mainpage'),
            err.statusCode || 403,
            err.lang || 'ko'
        )
    }

    if (err instanceof PageNotFoundError) {
        return res.status(404).render('error', {
            title: 'Page Not Found',
            message: err.message
        })
    }

    if (err instanceof AuthenticationRequiredError) {
        return require(paths.resolve('error.js'))(
            req,
            res,
            null,
            localizedMessage || global.i18n.__('loginneeded'),
            err.returnLink || '/login',
            global.i18n.__(err.returnName || 'loginpage'),
            err.statusCode || 403,
            err.lang || 'ko'
        )
    }

    if (err instanceof ValidationError) {
        return res.status(400).render('error', {
            title: 'Validation Error',
            message: localizedMessage
        })
    }

    if (err instanceof CaptchaError) {
        return require(paths.resolve('error.js'))(
            req,
            res,
            null,
            localizedMessage,
            err.returnLink || 'javascript:window.history.back()',
            global.i18n.__(err.returnName || 'previousPage'),
            err.statusCode || 400,
            err.lang || 'ko'
        )
    }

    return res.status(err.statusCode || 500).render('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    })
}

module.exports = { errorHandler }
