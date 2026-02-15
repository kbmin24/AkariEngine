const express = require('express')
const ejs = require('ejs')
const date = require('date-and-time')
const { Op } = require('sequelize')
const { body } = require('express-validator')
const paths = require('../utils/paths')
const { validateRequest } = require(paths.middleware('validation'))
const { requirePermission } = require(paths.middleware('auth'))
const logger = require(paths.utils('logger'))

const router = express.Router()
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const load = (...segments) => require(paths.resolve(...segments))

module.exports = (services, options = {}) => {
    const csrfProtection = options.csrfProtection

    router.get('/admin',
        requirePermission('admin'),
        asyncRoute(async (req, res) => {
            const ejs = require('ejs')
            const view = load('view.js')
            const html = await ejs.renderFile(paths.view('admin/index.ejs'))
            view(req, res, {
                title: 'Admin tools',
                content: html,
                username: req.session.username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/grant',
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'grant' } })
            if (!p) {
                logger.admin('Unauthorised grant attempt', username, { ip: req.ipAddress })
                load('error.js')(req, res, null, 'You do not have a grant permission.', '/admin', 'the admin page')
                return
            }

            if (req.query.grantTo === undefined) {
                const html = await ejs.renderFile(paths.view('admin/grantName.ejs'), {})
                load('view.js')(req, res, {
                    title: 'Select username to grant to',
                    content: html,
                    username,
                    ipaddr: req.ipAddress
                })
                return
            }

            const u = await global.db.users.findOne({ where: { username: req.query.grantTo } })
            if (!u) {
                load('error.js')(req, res, null, 'No such user.', '/admin/grant', 'the grant page')
                return
            }

            const permissions = await global.db.perm.findAll({ where: { username: req.query.grantTo } })
            const html = await ejs.renderFile(paths.view('admin/grant.ejs'), {
                grantTo: req.query.grantTo,
                perms: JSON.stringify(permissions),
                csrfToken: req.csrfToken()
            })
            load('view.js')(req, res, {
                title: 'Grant to ' + req.query.grantTo,
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/blockuser',
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'block' } })
            if (!p) {
                logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
                load('error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
                return
            }

            const html = await ejs.renderFile(paths.view('admin/blockuser.ejs'), { csrfToken: req.csrfToken() })
            load('view.js')(req, res, {
                title: 'Block user',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/blockip',
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'block' } })
            if (!p) {
                logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
                load('error.js')(req, res, null, 'You do not have a block permission.', '/admin', 'the admin page')
                return
            }

            const html = await ejs.renderFile(paths.view('admin/blockIP.ejs'), { csrfToken: req.csrfToken() })
            load('view.js')(req, res, {
                title: 'Block IP address',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/loginhistory',
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'loginhistory' } })
            if (!p) {
                logger.admin('Unauthorised loginhistory attempt', username, { ip: req.ipAddress })
                load('error.js')(req, res, null, 'You do not have a loginhistory permission.', '/admin', 'the admin page')
                return
            }

            if (req.query.user) {
                await global.db.loginhistory.destroy({
                    where: {
                        createdAt: { [Op.lt]: (new Date() - 7257600000) }
                    }
                })
                await global.db.adminlog.create({
                    username,
                    job: `viewed login history of ${req.query.user}`
                })
                const lgIns = await global.db.loginhistory.findAll({ where: { username: req.query.user }, order: [['createdAt', 'DESC']] })
                const html = await ejs.renderFile(paths.view('admin/loginhistory.ejs'), { records: lgIns, date })
                load('view.js')(req, res, {
                    title: 'Login history of ' + req.query.user,
                    content: html,
                    username,
                    ipaddr: req.ipAddress
                })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/loginhistoryName.ejs'), {})
            load('view.js')(req, res, {
                title: 'Select username to view login history',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/hiderev',
        csrfProtection,
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'acl' } })
            if (!p) {
                logger.admin('Unauthorised rev hide attempt', username, { ip: req.ipAddress })
                load('error.js')(req, res, null, 'You do not have an acl permission.', '/admin', 'the admin page')
                return
            }

            const html = await ejs.renderFile(paths.view('admin/hiderev.ejs'), { csrfToken: req.csrfToken() })
            load('view.js')(req, res, {
                title: 'Hide specific revision of a page',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/gongji',
        csrfProtection,
        asyncRoute(async (req, res) => {
            // TODO move this to extension. Why is it even here??
            const username = req.session.username
            if (username === undefined) {
                load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'board' } })
            if (!p) {
                load('error.js')(req, res, null, 'You do not have a board permission.', '/admin', 'the admin page')
                return
            }

            const html = await ejs.renderFile(paths.view('admin/gongji.ejs'), { csrfToken: req.csrfToken() })
            load('view.js')(req, res, {
                title: '게시판 공지 변경',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.post('/admin/grant',
        csrfProtection,
        requirePermission('grant'),
        body('grantTo').trim().notEmpty(),
        body('permissions').isArray(),
        validateRequest,
        async (req, res, next) => {
            try {
                for (const permission of req.body.permissions) {
                    await services.permission.grantPermission(
                        req.session.username,
                        req.body.grantTo,
                        permission
                    )
                }
                res.redirect('/admin')
            } catch (error) {
                next(error)
            }
        }
    )

    return router
}
