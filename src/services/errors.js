import i18n from 'i18n'
import { BACK_LINK, LOGIN_LINK } from '../utils/httpHelper.js'
// Some standardised errors

function getDefaultLocale() {
    if (global.conf && global.conf.defaultLocale) return global.conf.defaultLocale
    return 'en_GB'
}

// translate to default locale
function translate(i18nKey, params = {}, locale = getDefaultLocale(), fallback = '') {
    if (!i18nKey) return fallback
    if (!i18n || typeof i18n.__ !== 'function') return fallback || i18nKey

    try {
        return i18n.__({ phrase: i18nKey, locale }, params)
    } catch (_error) {
        return fallback || i18nKey
    }
}

class AppError extends Error {
    constructor(messageOrOptions, statusCode = 500) {
        const options = typeof messageOrOptions === 'object' && messageOrOptions !== null
            ? messageOrOptions
            : { message: messageOrOptions }

        const defaultMessage = options.message || options.defaultMessage || 'Application error'

        // Translate if we have an i18nkey, otherwise spit out the default message
        const defaultLocaleMessage = options.i18nKey
            ? translate(options.i18nKey, options.i18nParams || {}, getDefaultLocale(), defaultMessage)
            : defaultMessage

        super(defaultLocaleMessage)
        this.name = this.constructor.name
        this.statusCode = options.statusCode || statusCode
        this.i18nKey = options.i18nKey
        this.i18nParams = options.i18nParams || {}
        this.defaultMessage = defaultLocaleMessage
    }

    getLocalizedMessage(req) {
        if (!this.i18nKey) return this.message

        return req.__(this.i18nKey, this.i18nParams)
    }
}

class PageNotFoundError extends AppError {
    constructor(title) {
        super(`Page not found: ${title}`, 404)
    }
}

class PageExistsError extends AppError {
    constructor(title) {
        super(`Page already exists: ${title}`, 400)
    }
}

class RevisionNotFoundError extends AppError {
    constructor(title, rev) {
        super(`Revision not found: ${title}#${rev}`, 404)
    }
}

class ValidationError extends AppError {
    constructor(messageOrOptions) {
        const options = typeof messageOrOptions === 'object' && messageOrOptions !== null
            ? messageOrOptions
            : { message: messageOrOptions }
        super({
            message: options.message || 'Validation failed',
            i18nKey: options.i18nKey,
            i18nParams: options.i18nParams,
            statusCode: options.statusCode || 400
        })
        this.code = options.code
        this.details = options.details || {}
    }
}

class PermissionDeniedError extends AppError {
    constructor(action, resource = null, details = {}) {
        super({
            message: details.message || `Permission denied: ${action}${resource ? ` on ${resource}` : ''}`,
            i18nKey: details.i18nKey,
            i18nParams: details.i18nParams,
            statusCode: 403
        })
        this.action = action
        this.resource = resource
        this.details = details
        this.returnLink = details.returnLink || BACK_LINK
        this.returnName = details.returnName || 'previousPage'
        this.lang = details.lang || 'ko'
    }
}

class AuthenticationRequiredError extends AppError {
    constructor(details = {}) {
        super({
            message: details.message || 'Authentication required',
            i18nKey: details.i18nKey,
            i18nParams: details.i18nParams,
            statusCode: 401
        })
        this.returnLink = details.returnLink || LOGIN_LINK
        this.returnName = details.returnName || 'loginpage'
        this.lang = details.lang || 'ko'
    }
}
class CaptchaError extends AppError {
    constructor(messageOrOptions = 'Captcha verification failed', details = {}) {
        const options = typeof messageOrOptions === 'object' && messageOrOptions !== null
            ? messageOrOptions
            : { message: messageOrOptions, ...details }
        super({
            message: options.message || 'Captcha verification failed',
            i18nKey: options.i18nKey,
            i18nParams: options.i18nParams,
            statusCode: options.statusCode || 400
        })
        this.returnLink = options.returnLink || BACK_LINK
        this.returnName = options.returnName || 'previousPage'
        this.lang = options.lang || 'ko'
    }
}

class EditConflictError extends AppError {
    constructor(conflicts = [], details = {}) {
        super({
            message: details.message || 'Edit conflict',
            i18nKey: details.i18nKey,
            i18nParams: details.i18nParams,
            statusCode: details.statusCode || 409
        })
        this.code = details.code || 'EDIT_CONFLICT'
        this.conflicts = conflicts
        this.merged = details.merged
        this.chunks = details.chunks || []
        this.details = details
    }
}

export {
    AppError,
    PageNotFoundError,
    PageExistsError,
    RevisionNotFoundError,
    ValidationError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    CaptchaError,
    EditConflictError
}
