import express from 'express'
import { asyncRoute } from '../utils/httpHelper.js'
import { chkCaptcha } from '../middlewares/chkCaptcha.js'
import { requireEveryone } from '../middlewares/permission.js' // 'everyone' ACL level
import threadListHandler from '../threads/threadList.js'
import createThreadHandler from '../threads/createThread.js'
import threadHandler from '../threads/thread.js'
import recentDiscussHandler from '../threads/rd.js'

export default (_services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/threads/:name(*)', asyncRoute(async (req, res) => {
        await threadListHandler(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            block: global.db.block
        })
    }))

    router.post('/threads/:name(*)',
        chkCaptcha,
        requireEveryone,
        asyncRoute(async (req, res) => {
        await createThreadHandler(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            threadcomment: global.db.threadcomment,
            recentdiscuss: global.db.recentdiscuss,
            block: global.db.block,
            perm: global.db.perm
        })
    }))

    router.get('/thread/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
        await threadHandler(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            threadcomment: global.db.threadcomment,
            perm: global.db.perm
        })
    }))

    router.get('/RecentDiscuss', asyncRoute(async (req, res) => {
        await recentDiscussHandler(req, res, global.db.recentdiscuss, global.db.thread)
    }))
    
    return router
}
