const { validationResult } = require('express-validator')

function validateRequest(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        })
    }

    next()
}

module.exports = { validateRequest }
