const express = require('express')
const paths = require('../utils/paths')

const router = express.Router()
const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

module.exports = (_services, options = {}) => {
    const csrfProtection = options.csrfProtection

    router.get('/threads/:name(*)', asyncRoute(async (req, res) => {
        await load('threads', 'threadList.js')(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            block: global.db.block
        })
    }))

    router.post('/threads/:name(*)', asyncRoute(async (req, res) => {
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

    router.get('/ajax/threadcomments', asyncRoute(async (req, res) => {
        await load('AJAX', 'threadcomments.js')(req, res, {
            pages: global.db.pages,
            thread: global.db.thread,
            threadcomment: global.db.threadcomment,
            file: global.db.mfile
        })
    }))

    router.get('/ajax/threadinfo', asyncRoute(async (req, res) => {
        await load('AJAX', 'threadinfo.js')(req, res, {
            thread: global.db.thread,
            block: global.db.block
        })
    }))

    router.get('/ajax/threadlist', asyncRoute(async (req, res) => {
        await load('AJAX', 'threadlist.js')(req, res, global.db.thread)
    }))

    return router
}
