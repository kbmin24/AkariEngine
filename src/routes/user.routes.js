import express from 'express'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'
import { genCaptcha } from '../utils/captcha.js'
import signupHandler from '../user/signup.js'
import loginHandler from '../user/login.js'
import settingsHandler from '../user/settings.js'
import contributionHandler from '../user/contribution.js'
import renderView from '../view.js'

export default (_services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        const captchaSVG = await genCaptcha()
        await renderTemplateInLayout(req, res, 'user/signup.ejs', { captcha: captchaSVG, l: res.__ }, {
            title: res.__('register'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/signup',
        chkCaptcha,
        asyncRoute(async (req, res) => {
        await signupHandler(req, res, global.db.users)
    }))

    router.get('/login', csrfProtection, asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'user/login.ejs', { csrfToken: req.csrfToken(), l: res.__ }, {
            title: res.__('login'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/login', csrfProtection, asyncRoute(async (req, res) => {
        await loginHandler(req, res, global.db.users, global.db.loginhistory)
    }))

    router.get('/logout', (req, res) => {
        req.session.regenerate(() => {})
        res.redirect('/')
    })

    router.get('/settings', csrfProtection, asyncRoute(async (req, res) => {
        const username = req.session.username ? req.session.username : null
        const sR = await global.db.settings.findOne({
            where: {
                user: username,
                key: 'sign'
            }
        })
        const sign = sR ? sR.value : ''
        await renderTemplateInLayout(req, res, 'user/settings.ejs', {
            csrfToken: req.csrfToken(),
            sign,
            username,
            l: res.__
        }, {
            title: res.__('settings'),
            username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/settings/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
        await settingsHandler(req, res, {
            settings: global.db.settings,
            users: global.db.users
        })
    }))

    router.get('/contribution/:name(*)', asyncRoute(async (req, res) => {
        await contributionHandler(req, res, global.db.history)
    }))

    router.get('/whoami', (req, res) => {
        renderView(req, res, {
            title: 'You are',
            content: `${req.session.username}<br>IP Address: ${req.ipAddress}`,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    })

    return router
}
