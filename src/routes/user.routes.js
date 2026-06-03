import express from 'express'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { asyncRoute } from '../utils/httpHelper.js'
import { genCaptcha } from '../utils/captcha.js'
import signupPost from '../controllers/user/signupPost.js'
import loginPost from '../controllers/user/loginPost.js'
import settingsPost from '../controllers/user/settingsPost.js'
import contributionGet from '../controllers/user/contributionGet.js'
import { param, query, body } from 'express-validator'

import { validateRequest } from '../middlewares/validation.js'

export default (options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        res.json({ captcha: await genCaptcha() })
    }))

    router.post('/signup',
        chkCaptcha,
        body('id').trim().notEmpty(),
        body('password').notEmpty(),
        body('passwordConfirm').notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
        await signupPost(req, res)
    }))

    router.get('/login', csrfProtection, asyncRoute(async (req, res) => {
        res.json({ csrfToken: req.csrfToken() })
    }))

    router.post('/login',
        body('id').trim().notEmpty(),
        body('password').notEmpty(),
        validateRequest,
        csrfProtection,
        asyncRoute(async (req, res) => {
        await loginPost(req, res)
    }))

    router.get('/logout', (req, res) => {
        req.session.destroy(() => {})
        res.json({ success: true })
    })

    router.get('/settings',
        csrfProtection,
        asyncRoute(async (req, res) => {
        res.json({
            username: req.session.username || null,
            csrfToken: req.csrfToken()
        })
    }))

    router.post('/settings/:name(*)', 
        csrfProtection,
        asyncRoute(settingsPost)
    )

    router.get('/contribution/:name(*)',
        param('name').trim().notEmpty(),
        query('from').optional().isInt(),
        validateRequest,
        asyncRoute(async (req, res) => {
        await contributionGet(req, res)
    }))

    router.get('/whoami', (req, res) => {
        res.json({ username: req.session.username || null, ipAddress: req.ipAddress })
    })

    return router
}
