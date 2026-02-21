const express = require('express')
const { load, asyncRoute } = require('../utils/httpHelper')
const paths = require('../utils/paths')
const { chkCaptcha } = require(paths.middleware('chkCaptcha'))
const { requireEveryone } = require(paths.middleware('permission')) // 'everyone' ACL level

module.exports = (_services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/threads/:name(*)', asyncRoute(async (req, res) => {
        await load('threads', 'threadList.js')(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            block: global.db.block
        })
    }))

    router.post('/threads/:name(*)',
        chkCaptcha,
        requireEveryone,
        asyncRoute(async (req, res) => {
        await load('threads', 'createThread.js')(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            threadcomment: global.db.threadcomment,
            recentdiscuss: global.db.recentdiscuss,
            block: global.db.block,
            perm: global.db.perm
        })
    }))

    router.get('/thread/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
        await load('threads', 'thread.js')(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            threadcomment: global.db.threadcomment,
            perm: global.db.perm
        })
    }))

    router.get('/RecentDiscuss', asyncRoute(async (req, res) => {
        await load('threads', 'rd.js')(req, res, global.db.recentdiscuss, global.db.thread)
    }))
    
    return router
}
