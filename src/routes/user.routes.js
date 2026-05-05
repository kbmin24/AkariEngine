import express from 'express'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { genCaptcha } from '../utils/captcha.js'
import signupPost from '../controllers/user/signupPost.js'
import loginPost from '../controllers/user/loginPost.js'
import settingsPost from '../controllers/user/settingsPost.js'
import contributionGet from '../controllers/user/contributionGet.js'
import renderView from '../view.js'
import { param, query, body } from 'express-validator'

import { validateRequest } from '../middlewares/validation.js'

export default (_services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        const captchaSVG = await genCaptcha()
        await renderTemplateInLayout(req, res, 'user/signup.ejs', { captcha: captchaSVG, l: res.__ }, {
            title: res.__('register')
        })
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
        await renderTemplateInLayout(req, res, 'user/login.ejs', { csrfToken: req.csrfToken(), l: res.__ }, {
            title: res.__('login'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
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
        req.session.regenerate(() => {})
        res.redirect('/')
    })

    router.get('/settings',
        csrfProtection,
        asyncRoute(async (req, res) => {
        const username = req.session.username ? req.session.username : null
        await renderTemplateInLayout(req, res, 'user/settings.ejs', {
            csrfToken: req.csrfToken(),
            username,
            l: res.__
        }, {
            title: res.__('settings'),
            username,
            ipaddr: req.ipAddress
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
        renderView(req, res, {
            title: 'You are',
            content: `${req.session.username}<br>IP Address: ${req.ipAddress}`
        })
    })

    return router
}
