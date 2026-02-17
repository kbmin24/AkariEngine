const express = require('express')
const i18n = require("i18n")
const { asyncRoute, renderTemplateInLayout } = require('../utils/httpHelper')

module.exports = () => {
    const router = express.Router()
    router.get('/', (req, res) => {
        res.redirect('/w/FrontPage')
    })

    router.get('/Licence', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'license.ejs', {}, { title: 'Licence' })
    }))

    router.get('/noEmail', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'etc/noEmail.ejs', { l: res.__ }, { title: i18n.__('noEmail') })
    }))

    router.get('/orphaned', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'pages/orphaned.ejs', { t: i18n.__ }, { title: i18n.__('orphaned_pages') })
    }))

    return router
}
