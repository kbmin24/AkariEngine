const express = require('express')
const paths = require('../utils/paths')
const ejs = require('ejs')

const router = express.Router()
const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    load('view.js')(req, res, {
        ...layoutData,
        content: html
    })
}

module.exports = (_services, options = {}) => {
    const csrfProtection = options.csrfProtection

    router.get('/signup', asyncRoute(async (req, res) => {
        const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
        await renderTemplateInLayout(req, res, 'user/signup.ejs', { captcha: captchaSVG, l: global.i18n.__ }, {
            title: global.i18n.__('register'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/signup', asyncRoute(async (req, res) => {
        await load('user', 'signup.js')(req, res, global.sequelize, global.db.users, global.db.perm)
    }))

    router.get('/login', csrfProtection, asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'user/login.ejs', { csrfToken: req.csrfToken(), l: global.i18n.__ }, {
            title: global.i18n.__('login'),
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/login', csrfProtection, asyncRoute(async (req, res) => {
        await load('user', 'login.js')(req, res, global.db.users, global.db.loginhistory)
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
            l: global.i18n.__
        }, {
            title: global.i18n.__('settings'),
            username,
            ipaddr: req.ipAddress
        })
    }))

    router.post('/settings/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
        await load('user', 'settings.js')(req, res, {
            settings: global.db.settings,
            users: global.db.users
        })
    }))

    router.get('/contribution/:name(*)', asyncRoute(async (req, res) => {
        await load('user', 'contribution.js')(req, res, global.db.history)
    }))

    router.get('/whoami', (req, res) => {
        load('view.js')(req, res, {
            title: 'You are',
            content: `${req.session.username}<br>IP Address: ${req.ipAddress}`,
            username: req.session.username,
            ipaddr: req.ipAddress
        })
    })

    return router
}
