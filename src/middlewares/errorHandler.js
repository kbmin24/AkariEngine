import logger from '../utils/logger.js'

import {
    PageNotFoundError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    ValidationError,
    CaptchaError,
    RevisionNotFoundError
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

function isApiRequest(req) {
    return req.path.startsWith('/api') || req.path.startsWith('/api/')
}

function sendJsonError(res, statusCode, message, i18nKey) {
    return res.status(statusCode).json({ error: true, message, i18nKey: i18nKey || null })
}

function errorHandler(err, req, res, next) {
    if (!err) {
        logger.error('Error handler called without an error object')
        if (isApiRequest(req)) return sendJsonError(res, 500, 'An undefined error occurred')
        return res.status(500).json({ error: true, message: 'An undefined error occurred' })
    }
    if (err.code === 'EBADCSRFTOKEN') {
        return next(err) // pass it to legacy handler
    }

    const englishMessage = getEnglishMessage(res, err)
    logger.error(`Request error: ${englishMessage}`, getStackForLogging(err, englishMessage))

    const localizedMessage = (typeof err.getLocalizedMessage === 'function')
        ? err.getLocalizedMessage(req)
        : err.message

    if (err instanceof PermissionDeniedError) {
        return sendJsonError(res, err.statusCode || 403, localizedMessage, err.i18nKey)
    }

    if (err instanceof PageNotFoundError) {
        return sendJsonError(res, err.statusCode || 404, res.__('page404'), 'page404')
    }

    if (err instanceof AuthenticationRequiredError) {
        return sendJsonError(res, err.statusCode || 401, localizedMessage || res.__('loginneeded'), err.i18nKey || 'loginneeded')
    }

    if (err instanceof ValidationError) {
        return sendJsonError(res, err.statusCode || 400, localizedMessage, err.i18nKey)
    }

    if (err instanceof CaptchaError) {
        return sendJsonError(res, err.statusCode || 400, localizedMessage, err.i18nKey)
    }

    if (err instanceof RevisionNotFoundError) {
        return sendJsonError(res, err.statusCode || 404, localizedMessage || res.__('revision404'), err.i18nKey || 'revision404')
    }

    const message = process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    return sendJsonError(res, err.statusCode || 500, message)
}

export { errorHandler }
