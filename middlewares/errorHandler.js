const paths = require('../utils/paths')
const i18n = require("i18n")
const logger = require(paths.utils('logger'))
const {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
    CaptchaError
} = require('../services/errors')

function getEnglishMessage(err) {
    if (!err) return 'Unknown error'

    if (err.i18nKey && i18n && typeof i18n.__ === 'function') {
        try {
            return i18n.__({ phrase: err.i18nKey, locale: 'en_GB' }, err.i18nParams || {})
        } catch (_error) {
            return err.message || 'Unknown error'
        }
    }

    return err.message || 'Unknown error'
}

function getStackForLogging(err, englishMessage) {
    if (!err || !err.stack) return err

    const stackLines = String(err.stack).split('\n')
    if (stackLines.length === 0) return err.stack

    stackLines[0] = `${err.name || 'Error'}: ${englishMessage}`
    return stackLines.join('\n')
}

function errorHandler(err, req, res, next) {
    if (err && err.code) {
        return next(err) // pass it to legacy handler
    }

    const englishMessage = getEnglishMessage(err)
    logger.error(`Request error: ${englishMessage}`, getStackForLogging(err, englishMessage))

    const localizedMessage = (err && typeof err.getLocalizedMessage === 'function')
        ? err.getLocalizedMessage(req)
        : err.message

    if (err instanceof PermissionDeniedError) {
        return require(paths.utils('error'))(
            req,
            res,
            {
                description: localizedMessage,
                returnLink: err.returnLink || '/',
                returnName: i18n.__(err.returnName || 'mainpage'),
                statusCode: err.statusCode || 403
            }
        )
    }

    if (err instanceof PageNotFoundError) {
        return res.status(404).render('error', {
            title: 'Page Not Found',
            message: err.message
        })
    }

    if (err instanceof AuthenticationRequiredError) {
        return require(paths.utils('error'))(
            req,
            res,
            {
                description: localizedMessage || i18n.__('loginneeded'),
                returnLink: err.returnLink || '/login',
                returnName: i18n.__(err.returnName || 'loginpage'),
                statusCode: err.statusCode || 403
            }
        )
    }

    if (err instanceof ValidationError) {
        return res.status(400).render('error', {
            title: 'Validation Error',
            message: localizedMessage
        })
    }

    if (err instanceof CaptchaError) {
        return require(paths.utils('error'))(
            req,
            res,
            {
                description: localizedMessage,
                returnLink: err.returnLink || 'javascript:window.history.back()',
                returnName: i18n.__(err.returnName || 'previousPage'),
                statusCode: err.statusCode || 400
            }
        )
    }

    return res.status(err.statusCode || 500).render('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    })
}

module.exports = { errorHandler }
