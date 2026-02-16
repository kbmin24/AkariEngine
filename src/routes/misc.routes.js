const express = require('express')
const ejs = require('ejs')
const paths = require('../utils/paths')

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

module.exports = () => {
    router.get('/', (req, res) => {
        res.redirect('/w/FrontPage')
    })

    router.get('/Licence', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'license.ejs', {}, { title: 'Licence' })
    }))

    router.get('/noEmail', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'etc/noEmail.ejs', { l: res.__ }, { title: global.i18n.__('noEmail') })
    }))

    router.get('/orphaned', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'pages/orphaned.ejs', {}, { title: '고립된 문서' })
    }))

    return router
}
