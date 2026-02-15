// Some standardised error

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message)
        this.name = this.constructor.name
        this.statusCode = statusCode
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

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400)
    }
}

class PermissionDeniedError extends AppError {
    constructor(action, resource = null, details = {}) {
        super(`Permission denied: ${action}${resource ? ` on ${resource}` : ''}`, 403)
        this.action = action
        this.resource = resource
        this.details = details
    }
}

class AuthenticationRequiredError extends AppError {
    constructor() {
        super('Authentication required', 401)
    }
}
class CaptchaError extends AppError {
    constructor() {
        super('Captcha verification failed', 400)
    }
}

module.exports = {
    AppError,
    PageNotFoundError,
    PageExistsError,
    ValidationError,
    PermissionDeniedError,
    AuthenticationRequiredError,
    CaptchaError
}
