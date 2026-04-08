import express from 'express'
import ejs from 'ejs'
import date from 'date-and-time'
import { Op } from 'sequelize'
import paths from '../utils/paths.js'
import { asyncRoute } from '../utils/httpHelper.js'
import { requirePermission } from '../middlewares/auth.js'
import { param } from 'express-validator'
import { validateRequest } from '../middlewares/validation.js'
import logger from '../utils/logger.js'
import renderView from '../view.js'
import renderError from '../utils/error.js'
import grantAdmin from '../admin/grant.js'
import blockUserAdmin from '../admin/blockuser.js'
import blockIpAdmin from '../admin/blockip.js'
import protectRevisionAdmin from '../admin/protectRevision.js'
import hideThreadCommentAdmin from '../admin/hidethreadcomment.js'
import changeThreadStatusAdmin from '../admin/changethreadstatus.js'
import changeThreadTitleAdmin from '../admin/changethreadtitle.js'
import gongjiAdmin from '../admin/gongji.js'
import developerGetHandler from '../admin/developerGetHandler.js'
import adminlogGetHandler from '../controllers/admin/adminlogGet.js'
import protectGet from '../controllers/admin/protectGet.js'
import protectPost from '../controllers/admin/protectPost.js'

export default (services, options = {}) => {
    const router = express.Router()
    const csrfProtection = options.csrfProtection

    router.get('/admin',
        requirePermission('admin'),
        asyncRoute(async (req, res) => {
            const html = await ejs.renderFile(paths.view('admin/index.ejs'))
            renderView(req, res, {
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
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'grant' } })
            if (!p) {
                logger.admin('Unauthorised grant attempt', username, { ip: req.ipAddress })
                renderError(req, res, { description: 'You do not have a grant permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            if (req.query.grantTo === undefined) {
                const html = await ejs.renderFile(paths.view('admin/grantName.ejs'), {})
                renderView(req, res, {
                    title: 'Select username to grant to',
                    content: html,
                    username,
                    ipaddr: req.ipAddress
                })
                return
            }

            const u = await global.db.users.findOne({ where: { username: req.query.grantTo } })
            if (!u) {
                renderError(req, res, { description: 'No such user.', returnLink: '/admin/grant', returnName: 'the grant page' })
                return
            }

            const permissions = await global.db.perm.findAll({ where: { username: req.query.grantTo } })
            const html = await ejs.renderFile(paths.view('admin/grant.ejs'), {
                grantTo: req.query.grantTo,
                perms: JSON.stringify(permissions),
                csrfToken: req.csrfToken()
            })
            renderView(req, res, {
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
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'block' } })
            if (!p) {
                logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
                renderError(req, res, { description: 'You do not have a block permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/blockuser.ejs'), { csrfToken: req.csrfToken() })
            renderView(req, res, {
                title: 'Block user',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.get('/admin/blockip',
        csrfProtection,
        requirePermission('block'),
        asyncRoute(async (req, res) => {
            const username = req.session.username
            if (username === undefined) {
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'block' } })
            if (!p) {
                logger.admin('Unauthorised block attempt', username, { ip: req.ipAddress })
                renderError(req, res, { description: 'You do not have a block permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/blockIP.ejs'), { csrfToken: req.csrfToken() })
            renderView(req, res, {
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
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'loginhistory' } })
            if (!p) {
                logger.admin('Unauthorised loginhistory attempt', username, { ip: req.ipAddress })
                renderError(req, res, { description: 'You do not have a loginhistory permission.', returnLink: '/admin', returnName: 'the admin page' })
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
                renderView(req, res, {
                    title: 'Login history of ' + req.query.user,
                    content: html,
                    username,
                    ipaddr: req.ipAddress
                })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/loginhistoryName.ejs'), {})
            renderView(req, res, {
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
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'acl' } })
            if (!p) {
                logger.admin('Unauthorised rev hide attempt', username, { ip: req.ipAddress })
                renderError(req, res, { description: 'You do not have an acl permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/hiderev.ejs'), { csrfToken: req.csrfToken() })
            renderView(req, res, {
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
                renderError(req, res, { description: '로그인이 필요합니다.', returnLink: '/login', returnName: '로그인 페이지', statusCode: 404 })
                return
            }

            const p = await global.db.perm.findOne({ where: { username, perm: 'board' } })
            if (!p) {
                renderError(req, res, { description: 'You do not have a board permission.', returnLink: '/admin', returnName: 'the admin page' })
                return
            }

            const html = await ejs.renderFile(paths.view('admin/gongji.ejs'), { csrfToken: req.csrfToken() })
            renderView(req, res, {
                title: '게시판 공지 변경',
                content: html,
                username,
                ipaddr: req.ipAddress
            })
        })
    )

    router.post('/admin/grant',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await grantAdmin(req, res, global.db.users, global.db.perm, global.db.adminlog)
        })
    )

    router.post('/admin/blockuser',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await blockUserAdmin(req, res, global.db.users, global.db.perm, global.db.block, global.db.adminlog)
        })
    )

    router.post('/admin/blockip',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await blockIpAdmin(req, res, global.db.users, global.db.perm, global.db.block, global.db.adminlog)
        })
    )

    router.post('/admin/hiderev',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await protectRevisionAdmin(req, res, {
                perm: global.db.perm,
                page: global.db.pages,
                protect: global.db.protect,
                adminlog: global.db.adminlog
            })
        })
    )

    router.post('/admin/hidethread',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await hideThreadCommentAdmin(req, res, {
                perm: global.db.perm,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.post('/admin/changethreadstatus',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await changeThreadStatusAdmin(req, res, {
                perm: global.db.perm,
                thread: global.db.thread,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.post('/admin/changethreadname',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await changeThreadTitleAdmin(req, res, {
                perm: global.db.perm,
                thread: global.db.thread,
                threadcomment: global.db.threadcomment
            })
        })
    )

    router.post('/admin/gongji',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await gongjiAdmin(req, res, global.db.gongji)
        })
    )

    router.get('/admin/developer',
        csrfProtection,
        asyncRoute(async (req, res) => {
            await developerGetHandler(req, res, { perm: global.db.perm })
        })
    )

    router.get('/adminlog',
        asyncRoute(async (req, res) => {
            await adminlogGetHandler(req, res)
        })
    )

    router.get('/protect/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await protectGet(req, res)
        }))

    router.post('/protect/:name(*)',
        param('name').trim().notEmpty(),
        validateRequest,
        asyncRoute(async (req, res) => {
            await protectPost(req, res)
        }))

    return router
}
