import logger from '../utils/logger.js'
import renderError from '../utils/error.js'

import {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
    CaptchaError,
} from '../services/errors.js'

function getEnglishMessage(res, err) {
    if (!err) return 'Unknown error'

    if (err.i18nKey) {
        try {
            return res.__({ phrase: err.i18nKey, locale: 'en_GB' }, err.i18nParams || {})
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

// TODO: beautify this
function errorHandler(err, req, res, next) {
    if (!err) {
        logger.error('Error handler called without an error object')
        return res.status(500).render('error', {
            title: 'Undefined Error',
            message: 'An undefined error occurred. Please check the server logs for details.'
        })
    }
    if (err.code) {
        return next(err) // pass it to legacy handler
    }

    const englishMessage = getEnglishMessage(res, err)
    logger.error(`Request error: ${englishMessage}`, getStackForLogging(err, englishMessage))

    const localizedMessage = (typeof err.getLocalizedMessage === 'function')
        ? err.getLocalizedMessage(req)
        : err.message

    if (err instanceof PermissionDeniedError) {
        return renderError(
            req,
            res,
            {
                description: localizedMessage,
                returnLink: err.returnLink || '/',
                returnName: res.__(err.returnName || 'mainpage'),
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
        return renderError(
            req,
            res,
            {
                description: localizedMessage || res.__('loginneeded'),
                returnLink: err.returnLink || '/login',
                returnName: res.__(err.returnName || 'loginpage'),
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
        return renderError(
            req,
            res,
            {
                description: localizedMessage,
                returnLink: err.returnLink || 'javascript:window.history.back()',
                returnName: res.__(err.returnName || 'previousPage'),
                statusCode: err.statusCode || 400
            }
        )
    }

    return res.status(err.statusCode || 500).render('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    })
}

export { errorHandler }
