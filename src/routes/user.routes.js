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
import { requireEveryone } from '../middlewares/permission.js'
import { createRateLimiter } from '../utils/rateLimit.js'

export default (options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        res.json({ captcha: await genCaptcha() })
    }))

    router.post('/signup',
        createRateLimiter({
            windowMs: 15 * 60 * 1000,
            limit: 30
        }),
        chkCaptcha,
        body('id').trim().notEmpty(),
        body('password').notEmpty(),
        body('passwordConfirm').notEmpty(),
        validateRequest,
        requireEveryone,
        asyncRoute(async (req, res) => {
            await signupPost(req, res)
        }))

    router.get('/login', asyncRoute(async (req, res) => {
        res.json({ captcha: await genCaptcha() })
    }))

    router.post('/login',
        createRateLimiter({
            windowMs: 15 * 60 * 1000,
            limit: 30
        }),
        chkCaptcha,
        body('id').trim().notEmpty(),
        body('password').notEmpty(),
        validateRequest,
        csrfProtection,
        asyncRoute(async (req, res) => {
            await loginPost(req, res)
        }))

    router.post('/logout', csrfProtection, (req, res) => {
        req.session.destroy(() => {
            res.json({ success: true })
        })
    })

    router.get('/settings',
        asyncRoute(async (req, res) => {
            res.json({
                username: req.session.username || null
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

    router.get('/user/exists',
        createRateLimiter({
            windowMs: 60 * 1000,
            limit: 30
        }),
        query('id').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            const taken = await req.app.locals.services.user.existsCaseInsensitive(req.query.id)
            res.json({ available: !taken })
        }))
    router.get('/user/info/:name(*)',
        createRateLimiter({
            windowMs: 60 * 1000,
            limit: 300
        }),
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            const userInfo = await req.app.locals.services.user.getUserInfo(req.params.name)
            res.json(userInfo)
        }))

    return router
}
