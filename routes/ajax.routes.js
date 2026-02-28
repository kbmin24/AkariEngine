import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import threadCommentsController from '../controllers/ajax/threadcomments.js'
import threadInfoController from '../controllers/ajax/threadinfo.js'

export default () => {
    const router = express.Router()
    router.get('/ajax/autocomplete',
        asyncRoute(async (req, res) => {
            const query = req.query ? req.query.q : undefined
            if (!query) {
                res.json({})
                return
            }
            const results = await req.app.locals.services.search.autocompletePages(query, 10)
            res.json(results)
        }))

    router.get('/ajax/recentchanges', asyncRoute(async (req, res) => {
        const changes = await req.app.locals.services.recentChanges.getRecentChanges({
            show: req.query ? req.query.show : undefined,
            isUnique: req.query && req.query.isunique === 'true',
            excludeFile: req.query && req.query.excludefile === 'true',
            editOnly: req.query && req.query.editonly === 'true'
        })

        res.json(changes)
    }))

    router.get('/ajax/threadcomments', asyncRoute(async (req, res) => {
        await threadCommentsController(req, res)
    }))

    router.get('/ajax/threadinfo', asyncRoute(async (req, res) => {
        await threadInfoController(req, res)
    }))

    router.get('/ajax/threadlist', asyncRoute(async (req, res) => {
        const query = req.query ? req.query.q : undefined
        const threads = await req.app.locals.services.thread.getOpenThreadsByPageName(query)

        if (!threads) {
            res.json({})
            return
        }

        res.json(threads)
    }))


    return router
}
