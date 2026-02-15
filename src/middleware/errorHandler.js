const paths = require('../utils/paths')
const logger = require(paths.utils('logger'))
const {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError
} = require('../services/errors')
const { RouteAccessError } = require('./permission')

// TODO call error.js instead of this

function errorHandler(err, req, res, next) {
    if (err && err.code) {
        return next(err)
    }

    logger.error('Request error', err)

    if (err instanceof RouteAccessError) {
        return require(paths.resolve('error.js'))(
            req,
            res,
            null,
            err.message,
            err.returnLink,
            global.i18n.__(err.returnName),
            err.statusCode,
            err.lang
        )
    }

    if (err instanceof PageNotFoundError) {
        return res.status(404).render('error', {
            title: 'Page Not Found',
            message: err.message
        })
    }

    if (err instanceof PermissionDeniedError) {
        return res.status(403).render('error', {
            title: 'Permission Denied',
            message: err.message
        })
    }

    if (err instanceof AuthenticationRequiredError) {
        return res.redirect('/login')
    }

    if (err instanceof ValidationError) {
        return res.status(400).render('error', {
            title: 'Validation Error',
            message: err.message
        })
    }

    return res.status(err.statusCode || 500).render('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    })
}

module.exports = { errorHandler }
