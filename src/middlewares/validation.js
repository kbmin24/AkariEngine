import { validationResult } from 'express-validator'

function validateRequest(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        // TODO throw an error instead
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        })
    }

    next()
}

export { validateRequest }
