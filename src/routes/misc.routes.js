import express from 'express'
import { asyncRoute, renderTemplateInLayout } from '../utils/httpHelper.js'

export default () => {
    const router = express.Router()
    router.get('/', (req, res) => {
        res.redirect('/w/FrontPage')
    })

    router.get('/Licence', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'license.ejs', {}, { title: 'Licence' })
    }))

    router.get('/noEmail', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'etc/noEmail.ejs', { l: res.__ }, { title: res.__('noEmail') })
    }))

    router.get('/orphaned', asyncRoute(async (req, res) => {
        await renderTemplateInLayout(req, res, 'pages/orphaned.ejs', { t: res.__ }, { title: res.__('orphaned_pages') })
    }))

    return router
}
