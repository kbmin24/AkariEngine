const express = require('express')
const i18n = require("i18n")
const { chkCaptcha } = require('../middlewares/chkCaptcha.js')
const { asyncRoute, renderTemplateInLayout } = require('../utils/httpHelper')

module.exports = (_services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        const captchaSVG = await require('../utils/captcha.js').genCaptcha()
        await renderTemplateInLayout(req, res, 'user/signup.ejs', { captcha: captchaSVG, l: i18n.__ }, {
            title: i18n.__('register'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/signup',
        chkCaptcha,
        asyncRoute(async (req, res) => {
        await require('../user/signup.js')(req, res, global.db.users)
    }))

    router.get('/login', csrfProtection, asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'user/login.ejs', { csrfToken: req.csrfToken(), l: i18n.__ }, {
            title: i18n.__('login'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/login', csrfProtection, asyncRoute(async (req, res) => {
        await require('../user/login.js')(req, res, global.db.users, global.db.loginhistory)
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
            l: i18n.__
        }, {
            title: i18n.__('settings'),
            username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/settings/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
        await require('../user/settings.js')(req, res, {
            settings: global.db.settings,
            users: global.db.users
        })
    }))

    router.get('/contribution/:name(*)', asyncRoute(async (req, res) => {
        await require('../user/contribution.js')(req, res, global.db.history)
    }))

    router.get('/whoami', (req, res) => {
        require('../view.js')(req, res, {
            title: 'You are',
            content: `${req.session.username}<br>IP Address: ${req.ipAddress}`,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    })

    return router
}
