import express from 'express'
import { query } from 'express-validator'
import { validateRequest } from '../middlewares/validation.js'
import { asyncRoute } from '../utils/httpHelper.js'

export default () => {
    const router = express.Router()

    router.get('/Licence', (req, res) => {
        res.json({ page: 'licence' })
    })

    router.get('/noEmail', (req, res) => {
        res.json({})
    })

    router.get('/orphaned',
        query('from').optional().isInt().toInt({ min: 0 }).default(0),
        validateRequest,
        asyncRoute(async (req, res) => {
            const from = req.query.from
            const { pages, count } = await req.app.locals.services.page.getOrphanedPagesAndCount?.(from) || { pages: [], count: 0 }
            res.json({ pages, count })
        }))

    return router
}
