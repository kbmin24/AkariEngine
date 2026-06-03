import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'

export default () => {
    const router = express.Router()

    router.get('/Licence', (req, res) => {
        res.json({ page: 'licence' })
    })

    router.get('/noEmail', (req, res) => {
        res.json({})
    })

    router.get('/orphaned', asyncRoute(async (req, res) => {
        const pages = await req.app.locals.services.page.getOrphanedPages?.() || []
        res.json({ pages })
    }))

    return router
}
