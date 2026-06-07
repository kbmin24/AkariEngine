import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { requirePageAccess } from '../middlewares/permission.js' // 'everyone' ACL level
import threadsGet from '../controllers/threads/threadsGet.js'
import threadsPost from '../controllers/threads/threadsPost.js'
import threadGet from '../controllers/threads/threadGet.js'
import recentDiscussHandler from '../controllers/threads/recentDiscussGet.js'
import threadInfoController from '../controllers/ajax/threadinfo.js'
import threadCommentsController from '../controllers/ajax/threadcomments.js'

export default (options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/threads/:name(*)',
        requirePageAccess('read'),
        asyncRoute(threadsGet))

    router.post('/threads/:name(*)',
        chkCaptcha,
        requirePageAccess('read'),
        asyncRoute(threadsPost))

    router.get('/thread/:name(*)',
        csrfProtection,
        requirePageAccess('read'),
        asyncRoute(threadGet))

    router.get('/RecentDiscuss', asyncRoute(async (req, res) => {
        await recentDiscussHandler(req, res)
    }))

    router.get('/threadcomments', asyncRoute(async (req, res) => {
        await threadCommentsController(req, res)
    }))

    router.get('/threadinfo', asyncRoute(async (req, res) => {
        await threadInfoController(req, res)
    }))

    router.get('/threadlist', asyncRoute(async (req, res) => {
        const query = req.query ? req.query.q : undefined
        const threads = await req.app.locals.services.thread.getOpenThreadsByPageName(
            req.session.username,
            req.ipAddress,
            query)

        if (!threads) {
            res.json({})
            return
        }

        res.json(threads)
    }))

    return router
}
