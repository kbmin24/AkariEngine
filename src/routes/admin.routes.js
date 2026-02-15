const express = require('express')
const { body } = require('express-validator')
const paths = require('../utils/paths')
const { validateRequest } = require(paths.middleware('validation'))
const { requirePermission } = require(paths.middleware('auth'))

const router = express.Router()

module.exports = (services, options = {}) => {
    const csrfProtection = options.csrfProtection

    router.get('/admin',
        requirePermission('admin'),
        async (req, res) => {
            const ejs = require('ejs')
            const view = require(paths.resolve('view.js'))
            const html = await ejs.renderFile(paths.view('admin/index.ejs'))
            view(req, res, {
                title: 'Admin tools',
                content: html,
                username: req.session.username,
                ipaddr: req.ipAddress
            })
        }
    )

    // TODO migrate other routes too

    router.post('/admin/grant',
        csrfProtection,
        requirePermission('grant'),
        body('grantTo').trim().notEmpty(),
        body('permissions').isArray(),
        validateRequest,
        async (req, res, next) => {
            try {
                for (const permission of req.body.permissions) {
                    await services.permission.grantPermission(
                        req.session.username,
                        req.body.grantTo,
                        permission
                    )
                }
                res.redirect('/admin')
            } catch (error) {
                next(error)
            }
        }
    )

    return router
}
