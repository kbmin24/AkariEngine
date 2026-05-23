import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { requirePageAccess } from '../middlewares/permission.js' // 'everyone' ACL level
import threadsGet from '../controllers/threads/threadsGet.js'
import threadsPost from '../controllers/threads/threadsPost.js'
import threadGet from '../controllers/threads/threadGet.js'
import recentDiscussHandler from '../controllers/threads/recentDiscussGet.js'

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
    
    return router
}
